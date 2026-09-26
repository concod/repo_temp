--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:set_offcycle_all_spanx_v5 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-3
--comment: updated the function to handle the date updates
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.set_offcycle_all(text, text, jsonb, numeric, text, timestamp, jsonb, jsonb, jsonb, text, text);
DROP FUNCTION IF EXISTS inventory_smart.set_offcycle_all(text, text, jsonb, numeric, text, timestamp, jsonb, jsonb, jsonb, text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.set_offcycle_all(
    draft_id text,
    selection_level text,
    selected_values jsonb,
    roq_value numeric,
    distribute_method text,
    delivery_date timestamp without time zone,
    product_attribute_query jsonb,
    store_attribute_query jsonb,
    search_columns jsonb,
    roq_selection_type text,
    set_all_on text,
    date_filter jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_id_int int4;
    v_pa_query text := '';
    v_sa_query text := '';
    v_selection_query text := '';
    v_search_query text := '';
    v_where_clause text := '';
    v_query text := '';
    v_key text;
    v_values jsonb;
    v_selected_value text;
    v_row_count int4 := 0;
    v_total_raw_roq numeric := 0;
    v_base_value numeric := 0;
    v_remainder numeric := 0;
    v_updated_count int4 := 0;
    v_result jsonb := '{}'::jsonb;
    v_column_name text;
    v_selected_article text;
    v_article_where_clause text := '';
    v_article_row_count int4 := 0;
    v_article_total_raw_roq numeric := 0;
    v_total_updated int4 := 0;
    v_selected_item text;
    v_item_where_clause text := '';
    v_item_row_count int4 := 0;
    v_item_total_raw_roq numeric := 0;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
    v_date_filter_query text := '';
    v_delivery_date_set text := '';
    v_delivery_date_fiscal_week int4 := NULL;
BEGIN
    -- Validate inputs
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;
    IF roq_selection_type IS NULL OR roq_selection_type = '' THEN
        roq_selection_type := 'enter_roq_value';
    END IF;
    IF roq_selection_type NOT IN ('enter_roq_value', 'roq_source') THEN
        RAISE EXCEPTION 'roq_selection_type must be one of: enter_roq_value, roq_source';
    END IF;
    -- Validate based on roq_selection_type
    IF roq_selection_type = 'enter_roq_value' THEN

        IF (roq_value IS NULL OR roq_value < 0) AND delivery_date IS NULL THEN
            RAISE EXCEPTION 'roq_value must be non-negative when roq_selection_type is enter_roq_value and delivery_date is not provided';
        END IF;
        IF distribute_method IS NULL OR distribute_method = '' THEN

            IF roq_value IS NOT NULL AND roq_value >= 0 THEN
                RAISE EXCEPTION 'distribute_method is required when roq_selection_type is enter_roq_value and roq_value is provided';
            END IF;
        ELSIF distribute_method NOT IN ('copy_all', 'split_values') THEN
            RAISE EXCEPTION 'distribute_method must be one of: copy_all, split_values';
        END IF;
    ELSIF roq_selection_type = 'roq_source' THEN

        IF (set_all_on IS NULL OR set_all_on = '') AND delivery_date IS NULL THEN
            RAISE EXCEPTION 'set_all_on is required when roq_selection_type is roq_source and delivery_date is not provided';
        END IF;
        IF set_all_on IS NOT NULL AND set_all_on != '' AND set_all_on NOT IN ('base_roq', 'vendor_moq_optimized_roq') THEN
            RAISE EXCEPTION 'set_all_on must be one of: base_roq, vendor_moq_optimized_roq';
        END IF;
    END IF;
        -- Ensure at least one update is requested (ROQ or date)
    IF (roq_selection_type = 'enter_roq_value' AND (roq_value IS NULL OR roq_value < 0)) AND 
       (roq_selection_type = 'roq_source' AND (set_all_on IS NULL OR set_all_on = '')) AND
       delivery_date IS NULL THEN
        RAISE EXCEPTION 'At least one of roq_value/set_all_on or delivery_date must be provided';
    END IF;
    IF selection_level NOT IN ('unique_row_id', 'loc_code', 'size') THEN
        RAISE EXCEPTION 'selection_level must be one of: unique_row_id, loc_code, size';
    END IF;
    -- Convert draft_id to int4
    v_draft_id_int := draft_id::int4;
    -- Process date_filter
    IF date_filter IS NOT NULL AND jsonb_array_length(date_filter) > 0 THEN
        SELECT 
            CASE WHEN df->>'start_date' IS NOT NULL AND df->>'start_date' <> '' 
                 THEN to_date(df->>'start_date', 'MM-DD-YYYY') END,
            CASE WHEN df->>'end_date' IS NOT NULL AND df->>'end_date' <> '' 
                 THEN to_date(df->>'end_date', 'MM-DD-YYYY') END
        INTO v_start_date, v_end_date
        FROM jsonb_array_elements(date_filter) AS t(df)
        WHERE df->>'attribute_name' = 'deep_dive_dates'
        LIMIT 1;
    END IF;
    -- Map dates to fiscal weeks if provided
    IF v_start_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_start_week
        FROM global.fiscal_date_mapping fdm
        WHERE fdm.calendar_date = v_start_date
        LIMIT 1;
    END IF;
    IF v_end_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_end_week
        FROM global.fiscal_date_mapping fdm
        WHERE fdm.calendar_date = v_end_date
        LIMIT 1;
    END IF;
    -- Build date filter query for WHERE clause
    IF v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week;
    ELSIF v_start_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week >= ' || v_start_week;
    ELSIF v_end_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week <= ' || v_end_week;
    END IF;
    -- Build delivery date SET clause if provided
    IF delivery_date IS NOT NULL THEN
        -- Get fiscal week for the delivery date
        SELECT fdm.fiscal_year_week INTO v_delivery_date_fiscal_week
        FROM global.fiscal_date_mapping fdm
        WHERE fdm.calendar_date = delivery_date::date
        LIMIT 1;
        -- Build SET clause for both adjusted_delivery_date and receipt_fiscal_year_week
        v_delivery_date_set := ', adjusted_delivery_date = ' || quote_literal(delivery_date::text) || '::timestamp';
        IF v_delivery_date_fiscal_week IS NOT NULL THEN
            v_delivery_date_set := v_delivery_date_set || ', receipt_fiscal_year_week = ' || v_delivery_date_fiscal_week;
        END IF;
    END IF;
    -- Build product attribute filter query from JSONB
    IF product_attribute_query IS NOT NULL AND product_attribute_query != '{}'::jsonb THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_attribute_query)
        LOOP
            IF v_values->0->'values' IS NOT NULL AND jsonb_array_length(v_values->0->'values') > 0 THEN
                IF v_key = 'size' THEN
                    v_sa_query := v_sa_query || ' AND ocr.' || v_key || ' IN (';
                    v_sa_query := v_sa_query || (
                        SELECT string_agg(quote_literal(val), ',')
                        FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                    );
                    v_sa_query := v_sa_query || ')';
                ELSE
                    v_pa_query := v_pa_query || ' AND ' || v_key || ' IN (';
                    v_pa_query := v_pa_query || (
                        SELECT string_agg(quote_literal(val), ',')
                        FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                    );
                    v_pa_query := v_pa_query || ')';
                END IF;
            END IF;
        END LOOP;
    END IF;
    -- Build store attribute filter query from JSONB
    IF store_attribute_query IS NOT NULL AND store_attribute_query != '{}'::jsonb THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_attribute_query)
        LOOP
            IF v_values->0->'values' IS NOT NULL AND jsonb_array_length(v_values->0->'values') > 0 THEN
                v_sa_query := v_sa_query || ' AND ocr.' || v_key || ' IN (';
                v_sa_query := v_sa_query || (
                    SELECT string_agg(quote_literal(val), ',')
                    FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                );
                v_sa_query := v_sa_query || ')';
            END IF;
        END LOOP;
    END IF;
    -- Build search columns filter from JSONB
    IF search_columns IS NOT NULL AND search_columns != '{}'::jsonb THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(search_columns)
        LOOP
            IF jsonb_typeof(v_values) = 'array' AND jsonb_array_length(v_values) > 0 THEN
                v_search_query := v_search_query || ' AND ocr.' || v_key || ' IN (';
                v_search_query := v_search_query || (
                    SELECT string_agg(quote_literal(val), ',')
                    FROM jsonb_array_elements_text(v_values) AS t(val)
                );
                v_search_query := v_search_query || ')';
            END IF;
        END LOOP;
    END IF;
    -- Build base WHERE clause (without selection filter)
    v_where_clause := 'WHERE ocr.draft_id = ' || v_draft_id_int;
    -- Add product attribute filter using EXISTS if needed
    IF v_pa_query != '' THEN
        v_where_clause := v_where_clause || ' AND EXISTS (SELECT 1 FROM global.product_attributes_filter paf WHERE paf.article = ocr.article ' || v_pa_query || ')';
    END IF;
    -- Add store/product direct filters
    IF v_sa_query != '' THEN
        v_where_clause := v_where_clause || v_sa_query;
    END IF;
    -- Add search columns filter
    IF v_search_query != '' THEN
        v_where_clause := v_where_clause || v_search_query;
    END IF;
    -- Add date filter if provided
    IF v_date_filter_query != '' THEN
        v_where_clause := v_where_clause || v_date_filter_query;
    END IF;
    -- Add is_approved filter
    v_where_clause := v_where_clause || ' AND ocr.is_approved = FALSE';
    -- Handle date updates (when delivery_date is provided but no ROQ update is requested)
    IF delivery_date IS NOT NULL THEN
    
        IF (roq_selection_type = 'enter_roq_value' AND (roq_value IS NULL OR roq_value < 0)) OR
           (roq_selection_type = 'roq_source' AND (set_all_on IS NULL OR set_all_on = '')) THEN

            IF selected_values IS NOT NULL AND jsonb_array_length(selected_values) > 0 THEN
                IF selection_level = 'unique_row_id' THEN
                    v_column_name := 'article';
                ELSE
                    v_column_name := selection_level;
                END IF;
                v_selection_query := ' AND ocr.' || v_column_name || ' IN (';
                FOR v_selected_value IN
                    SELECT jsonb_array_elements_text(selected_values)
                LOOP
                    v_selection_query := v_selection_query || quote_literal(v_selected_value) || ',';
                END LOOP;
                v_selection_query := rtrim(v_selection_query, ',') || ')';
            END IF;
            v_query := v_where_clause || COALESCE(v_selection_query, '');

            v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET ' || substring(v_delivery_date_set from 3) || ' ' || v_query;
            EXECUTE v_query;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_result := jsonb_build_object(
                'status', 'success',
                'total_records_updated', v_updated_count,
                'selection_level', selection_level,
                'roq_selection_type', roq_selection_type,
                'update_type', 'date_update',
                'message', 'Updated delivery date'
            );
            RETURN v_result;
        END IF;
    END IF;
    -- Handle ROQ source cases (works for all selection levels)
    IF roq_selection_type = 'roq_source' THEN
        -- Build selection filter
        IF selected_values IS NOT NULL AND jsonb_array_length(selected_values) > 0 THEN
            IF selection_level = 'unique_row_id' THEN
                v_column_name := 'article';
            ELSE
                v_column_name := selection_level;
            END IF;
            v_selection_query := ' AND ocr.' || v_column_name || ' IN (';
            FOR v_selected_value IN
                SELECT jsonb_array_elements_text(selected_values)
            LOOP
                v_selection_query := v_selection_query || quote_literal(v_selected_value) || ',';
            END LOOP;
            v_selection_query := rtrim(v_selection_query, ',') || ')';
        END IF;
        v_query := v_where_clause || COALESCE(v_selection_query, '');
        IF set_all_on = 'base_roq' THEN
            -- Copy raw_roq_cof to order_quantity_cof
            v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = ocr.raw_roq_cof' || v_delivery_date_set || ' ' || v_query;
            EXECUTE v_query;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_result := jsonb_build_object(
                'status', 'success',
                'total_records_updated', v_updated_count,
                'selection_level', selection_level,
                'roq_selection_type', roq_selection_type,
                'set_all_on', set_all_on,
                'source_column', 'raw_roq_cof'
            );
        ELSIF set_all_on = 'vendor_moq_optimized_roq' THEN
            -- Copy roq_unconstrained_cof to order_quantity_cof
            v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = ocr.roq_unconstrained_cof' || v_delivery_date_set || ' ' || v_query;
            EXECUTE v_query;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_result := jsonb_build_object(
                'status', 'success',
                'total_records_updated', v_updated_count,
                'selection_level', selection_level,
                'roq_selection_type', roq_selection_type,
                'set_all_on', set_all_on,
                'source_column', 'roq_unconstrained_cof'
            );
        END IF;
    -- Handle enter_roq_value cases
    ELSIF roq_selection_type = 'enter_roq_value' THEN
        -- Special handling for unique_row_id with copy_all: apply roq_value to EACH article separately
        IF selection_level = 'unique_row_id' AND distribute_method = 'copy_all' AND selected_values IS NOT NULL AND jsonb_array_length(selected_values) > 0 THEN
            -- Process each article separately with the full roq_value
            v_total_updated := 0;
                FOR v_selected_article IN
                    SELECT jsonb_array_elements_text(selected_values)
                LOOP
                    -- Build WHERE clause for this specific article
                    v_article_where_clause := v_where_clause || ' AND ocr.article = ' || quote_literal(v_selected_article);
                    -- Count records for this article
                    v_query := 'SELECT COUNT(*) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_article_where_clause;
                    EXECUTE v_query INTO v_article_row_count;
                    IF v_article_row_count > 0 THEN
                        -- Calculate total raw_roq_cof for this article
                        v_query := 'SELECT COALESCE(SUM(raw_roq_cof), 0) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_article_where_clause || ' AND raw_roq_cof > 0';
                        EXECUTE v_query INTO v_article_total_raw_roq;
                        IF v_article_total_raw_roq = 0 THEN
                            -- Fall back to smart even distribution
                            v_base_value := FLOOR(roq_value::numeric / v_article_row_count::numeric);
                            v_remainder := roq_value - (v_base_value * v_article_row_count);
                            v_query := 'WITH numbered_records AS (SELECT ocr.*, ROW_NUMBER() OVER (ORDER BY ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_article_where_clause || ') 
                            UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN nr.rn <= ' || v_remainder || ' THEN ' || (v_base_value + 1) || ' ELSE ' || v_base_value || ' END' || v_delivery_date_set || ' 
                            FROM numbered_records nr WHERE ocr.draft_id = nr.draft_id AND ocr.article = nr.article AND ocr.loc_code = nr.loc_code AND ocr.size = nr.size AND ocr.receipt_fiscal_year_week = nr.receipt_fiscal_year_week';
                            EXECUTE v_query;
                            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                            v_total_updated := v_total_updated + v_updated_count;
                        ELSE
                            -- Proportional distribution based on raw_roq_cof for this article
                            v_query := 'SELECT COALESCE(SUM(CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_article_total_raw_roq || '::numeric) ELSE 0 END), 0)::numeric 
                            FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_article_where_clause;
                            EXECUTE v_query INTO v_base_value;
                            IF v_base_value < roq_value THEN
                                v_remainder := roq_value - v_base_value;
                                v_query := 'WITH proportional_values AS (SELECT ocr.draft_id, ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week, 
                                CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_article_total_raw_roq || '::numeric) ELSE 0 END as calculated_value, 
                                ROW_NUMBER() OVER (ORDER BY ocr.raw_roq_cof DESC, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn 
                                FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_article_where_clause || ') 
                                UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = pv.calculated_value + CASE WHEN pv.rn <= ' || v_remainder || ' THEN 1 ELSE 0 END' || v_delivery_date_set || ' 
                                FROM proportional_values pv WHERE ocr.draft_id = pv.draft_id AND ocr.article = pv.article AND ocr.loc_code = pv.loc_code AND ocr.size = pv.size AND ocr.receipt_fiscal_year_week = pv.receipt_fiscal_year_week';
                            ELSE
                                v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_article_total_raw_roq || '::numeric) ELSE 0 END' || v_delivery_date_set || ' ' || v_article_where_clause;
                            END IF;
                            EXECUTE v_query;
                            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                            v_total_updated := v_total_updated + v_updated_count;
                        END IF;
                    END IF;
                END LOOP;
                v_result := jsonb_build_object(
                    'status', 'success',
                    'total_records_updated', v_total_updated,
                    'selection_level', selection_level,
                    'distribution_method', distribute_method,
                    'roq_value', roq_value,
                    'articles_processed', jsonb_array_length(selected_values)
                );
        ELSE
            -- Handle copy_all for loc_code and size: apply roq_value to EACH selected item separately
            IF selection_level IN ('loc_code', 'size') AND distribute_method = 'copy_all' AND selected_values IS NOT NULL AND jsonb_array_length(selected_values) > 0 THEN
                -- Process each loc_code or size separately with the full roq_value
                v_total_updated := 0;
                FOR v_selected_item IN
                        SELECT jsonb_array_elements_text(selected_values)
                    LOOP
                        -- Build WHERE clause for this specific loc_code or size
                        v_item_where_clause := v_where_clause || ' AND ocr.' || selection_level || ' = ' || quote_literal(v_selected_item);
                        -- Count records for this item
                        v_query := 'SELECT COUNT(*) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_item_where_clause;
                        EXECUTE v_query INTO v_item_row_count;
                        IF v_item_row_count > 0 THEN
                            -- Calculate total raw_roq_cof for this item
                            v_query := 'SELECT COALESCE(SUM(raw_roq_cof), 0) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_item_where_clause || ' AND raw_roq_cof > 0';
                            EXECUTE v_query INTO v_item_total_raw_roq;
                            IF v_item_total_raw_roq = 0 THEN
                                -- Fall back to smart even distribution
                                v_base_value := FLOOR(roq_value::numeric / v_item_row_count::numeric);
                                v_remainder := roq_value - (v_base_value * v_item_row_count);
                                v_query := 'WITH numbered_records AS (SELECT ocr.*, ROW_NUMBER() OVER (ORDER BY ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn
                                FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_item_where_clause || ') 
                                UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN nr.rn <= ' || v_remainder || ' THEN ' || (v_base_value + 1) || ' ELSE ' || v_base_value || ' END' || v_delivery_date_set || ' 
                                FROM numbered_records nr WHERE ocr.draft_id = nr.draft_id AND ocr.article = nr.article AND ocr.loc_code = nr.loc_code AND ocr.size = nr.size AND ocr.receipt_fiscal_year_week = nr.receipt_fiscal_year_week';
                                EXECUTE v_query;
                                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                                v_total_updated := v_total_updated + v_updated_count;
                            ELSE
                                -- Proportional distribution based on raw_roq_cof for this item
                                v_query := 'SELECT COALESCE(SUM(CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_item_total_raw_roq || '::numeric) ELSE 0 END), 0)::numeric 
                                FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_item_where_clause;
                                EXECUTE v_query INTO v_base_value;
                                IF v_base_value < roq_value THEN
                                    v_remainder := roq_value - v_base_value;
                                    v_query := 'WITH proportional_values AS (SELECT ocr.draft_id, ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week, 
                                    CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_item_total_raw_roq || '::numeric) ELSE 0 END as calculated_value, 
                                    ROW_NUMBER() OVER (ORDER BY ocr.raw_roq_cof DESC, ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn 
                                    FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_item_where_clause || ') 
                                    UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = pv.calculated_value + CASE WHEN pv.rn <= ' || v_remainder || ' THEN 1 ELSE 0 END' || v_delivery_date_set || ' FROM proportional_values pv 
                                    WHERE ocr.draft_id = pv.draft_id AND ocr.article = pv.article AND ocr.loc_code = pv.loc_code AND ocr.size = pv.size AND ocr.receipt_fiscal_year_week = pv.receipt_fiscal_year_week';
                                ELSE
                                    v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_item_total_raw_roq || '::numeric) ELSE 0 END' || v_delivery_date_set || ' ' || v_item_where_clause;
                                END IF;
                                EXECUTE v_query;
                                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                                v_total_updated := v_total_updated + v_updated_count;
                            END IF;
                        END IF;
                    END LOOP;
                    v_result := jsonb_build_object(
                        'status', 'success',
                        'total_records_updated', v_total_updated,
                        'selection_level', selection_level,
                        'distribution_method', distribute_method,
                        'roq_value', roq_value,
                        'items_processed', jsonb_array_length(selected_values)
                    );
            ELSE
                -- For split_values with unique_row_id, or split_values for loc_code/size: distribute across all selected combined
                -- Build selection filter
                IF selected_values IS NOT NULL AND jsonb_array_length(selected_values) > 0 THEN
                    IF selection_level = 'unique_row_id' THEN
                        v_column_name := 'article';
                    ELSE
                        v_column_name := selection_level;
                    END IF;
                    v_selection_query := ' AND ocr.' || v_column_name || ' IN (';
                    FOR v_selected_value IN
                        SELECT jsonb_array_elements_text(selected_values)
                    LOOP
                        v_selection_query := v_selection_query || quote_literal(v_selected_value) || ',';
                    END LOOP;
                    v_selection_query := rtrim(v_selection_query, ',') || ')';
                END IF;
                v_query := v_where_clause || COALESCE(v_selection_query, '');
                -- Count matching records (across all selected if multiple)
                v_query := 'SELECT COUNT(*) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_query;
                EXECUTE v_query INTO v_row_count;
                IF v_row_count = 0 THEN
                    RETURN jsonb_build_object(
                        'status', 'error',
                        'message', 'No records found matching the selection criteria',
                        'total_records_updated', 0,
                        'selection_level', selection_level
                    );
                END IF;
                -- Calculate total raw_roq_cof for ALL matching records combined
                v_query := 'SELECT COALESCE(SUM(raw_roq_cof), 0) FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_where_clause || COALESCE(v_selection_query, '') || ' AND raw_roq_cof > 0';
                EXECUTE v_query INTO v_total_raw_roq;
                IF v_total_raw_roq = 0 THEN
                    -- Fall back to smart even distribution (FLOOR + remainder)
                    v_base_value := FLOOR(roq_value::numeric / v_row_count::numeric);
                    v_remainder := roq_value - (v_base_value * v_row_count);
                    v_query := 'WITH numbered_records AS (SELECT ocr.*, ROW_NUMBER() OVER (ORDER BY ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn 
                    FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_where_clause || COALESCE(v_selection_query, '') || ') 
                    UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN nr.rn <= ' || v_remainder || ' THEN ' || (v_base_value + 1) || ' ELSE ' || v_base_value || ' END' || v_delivery_date_set || ' 
                    FROM numbered_records nr WHERE ocr.draft_id = nr.draft_id AND ocr.article = nr.article AND ocr.loc_code = nr.loc_code AND ocr.size = nr.size AND ocr.receipt_fiscal_year_week = nr.receipt_fiscal_year_week';
                    EXECUTE v_query;
                    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                    v_result := jsonb_build_object(
                        'status', 'success',
                        'total_records_updated', v_updated_count,
                        'selection_level', selection_level,
                        'distribution_method', distribute_method,
                        'roq_value', roq_value,
                        'message', 'No raw_roq_cof found, used even distribution'
                    );
                ELSE
                    -- Proportional distribution based on raw_roq_cof across all records combined
                    -- Use CEIL to ensure values are rounded up, preventing decrease
                    v_query := 'SELECT COALESCE(SUM(CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_total_raw_roq || '::numeric) ELSE 0 END), 0)::numeric 
                    FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_where_clause || COALESCE(v_selection_query, '');
                    EXECUTE v_query INTO v_base_value;
                    -- Now update with adjustment if needed
                    IF v_base_value < roq_value THEN
                        v_remainder := roq_value - v_base_value;
                        v_query := 'WITH proportional_values AS (SELECT ocr.draft_id, ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week, 
                        CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_total_raw_roq || '::numeric) ELSE 0 END as calculated_value, 
                        ROW_NUMBER() OVER (ORDER BY ocr.raw_roq_cof DESC, ocr.article, ocr.loc_code, ocr.size, ocr.receipt_fiscal_year_week) as rn 
                        FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_where_clause || COALESCE(v_selection_query, '') || ') 
                        UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = pv.calculated_value + CASE WHEN pv.rn <= ' || v_remainder || ' THEN 1 ELSE 0 END' || v_delivery_date_set || ' FROM proportional_values pv 
                        WHERE ocr.draft_id = pv.draft_id AND ocr.article = pv.article AND ocr.loc_code = pv.loc_code AND ocr.size = pv.size AND ocr.receipt_fiscal_year_week = pv.receipt_fiscal_year_week';
                    ELSE
                        v_query := 'UPDATE inventory_smart.oms_cof_orders_recommended ocr SET order_quantity_cof = CASE WHEN ocr.raw_roq_cof > 0 THEN CEIL(' || roq_value || '::numeric * ocr.raw_roq_cof::numeric / ' || v_total_raw_roq || '::numeric) ELSE 0 END' || v_delivery_date_set || ' ' || v_where_clause || COALESCE(v_selection_query, '');
                    END IF;
                    EXECUTE v_query;
                    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                    v_result := jsonb_build_object(
                        'status', 'success',
                        'total_records_updated', v_updated_count,
                        'selection_level', selection_level,
                        'distribution_method', distribute_method,
                        'total_raw_roq', v_total_raw_roq,
                        'roq_value', roq_value
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN v_result;
END;
$function$;

