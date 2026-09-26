--liquibase formatted sql
--changeset raja.duraisamy:update_offcycle_product_details_spanx_v5 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-4
--comment: added receipt_fiscal_year_week update when adjusted_delivery_date changes
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_offcycle_product_details(text, text, jsonb, jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.update_offcycle_product_details(
    draft_id text,
    selection_level text,
    modifications_map jsonb,
    product_attribute_query jsonb,
    store_attribute_query jsonb,
    date_filter jsonb,
    article text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_id_int int4;
    v_pa_query text := '';
    v_sa_query text := '';
    v_search_query text := '';
    v_where_clause text := '';
    v_query text := '';
    v_pa_join text := '';
    v_key text;
    v_values jsonb;
    v_updated_count int4 := 0;
    v_total_updated int4 := 0;
    v_result jsonb := '{}'::jsonb;
    v_row_count int4 := 0;
    v_determined_level text;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
BEGIN
    -- Validate inputs
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;

    IF modifications_map IS NULL OR modifications_map = '{}'::jsonb THEN
        RAISE EXCEPTION 'modifications_map cannot be empty';
    END IF;

    IF selection_level IS NULL OR selection_level = '' THEN
        RAISE EXCEPTION 'selection_level is mandatory';
    END IF;

    v_draft_id_int := draft_id::int4;

    -- Build filters ONLY for unique_row_id level
    -- Filters are not needed for loc_code/size levels as they are already filtered
    IF selection_level = 'unique_row_id' THEN
        -- Build product attribute filter query from JSONB
        -- Note: 'size' and 'article' are direct columns in oms_cof_orders_recommended, not in product_attributes_filter
        IF product_attribute_query IS NOT NULL AND product_attribute_query != '{}'::jsonb THEN
            FOR v_key, v_values IN
                SELECT key, value
                FROM jsonb_each(product_attribute_query)
            LOOP
                -- Handle 'size' and 'article' filters directly on ocr table, not through product_attributes_filter
                -- Only add filter if values array is not empty
                IF v_values->0->'values' IS NOT NULL AND jsonb_array_length(v_values->0->'values') > 0 THEN
                    IF v_key IN ('size', 'article') THEN
                        v_sa_query := v_sa_query || ' AND ocr.' || v_key || ' IN (';
                        v_sa_query := v_sa_query || (
                            SELECT string_agg(quote_literal(val), ',')
                            FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                        );
                        v_sa_query := v_sa_query || ')';
                    ELSE
                        v_pa_query := v_pa_query || ' AND paf.' || v_key || ' IN (';
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
                -- Only add filter if values array is not empty
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

        -- Build WHERE clause for product_attributes_filter JOIN
        v_search_query := 'WHERE ocr.draft_id = ' || v_draft_id_int;
        
        IF v_sa_query != '' THEN
            v_search_query := v_search_query || v_sa_query;
        END IF;
        
        -- Add date filter if provided
        IF v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
            v_search_query := v_search_query || ' AND ocr.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week;
        ELSIF v_start_week IS NOT NULL THEN
            v_search_query := v_search_query || ' AND ocr.receipt_fiscal_year_week >= ' || v_start_week;
        ELSIF v_end_week IS NOT NULL THEN
            v_search_query := v_search_query || ' AND ocr.receipt_fiscal_year_week <= ' || v_end_week;
        END IF;

        -- Build WHERE conditions for JOIN (without the initial WHERE keyword)
        v_search_query := CASE 
            WHEN v_search_query LIKE 'WHERE %' THEN SUBSTRING(v_search_query FROM 7) 
            ELSE v_search_query 
        END;
        
        -- Build product_attributes_filter JOIN clause if needed
        IF v_pa_query != '' THEN
            v_pa_join := ' INNER JOIN global.product_attributes_filter paf ON paf.article = ocr.article ' || v_pa_query;
        ELSE
            v_pa_join := '';
        END IF;
        
        -- Update order_quantity_cof and adjusted_delivery_date together using ratio-based approach
        -- If ratio is "Infinity" or "NaN": distribute order_quantity_cof equally across all matching rows
        -- Otherwise: multiply raw_roq_cof by ratio
        -- Also updates adjusted_delivery_date if provided in the same query
        v_query := 'SELECT COUNT(*) FROM jsonb_each(' || quote_literal(modifications_map::text) || '::jsonb) WHERE (value->>''order_quantity_cof'')::numeric IS NOT NULL OR ((value->>''adjusted_delivery_date'') IS NOT NULL AND (value->>''adjusted_delivery_date'') <> '''' AND (value->>''adjusted_delivery_date'') <> ''Invalid date'')';
        EXECUTE v_query INTO v_row_count;
        IF v_row_count > 0 THEN
            v_query := '
                WITH article_mods AS (
                    SELECT 
                        key::text as article, 
                        (value->>''order_quantity_cof'')::numeric as new_order_qty,
                        COALESCE(value->>''ratio'', '''') as ratio,
                        CASE 
                            WHEN (value->>''adjusted_delivery_date'') IS NOT NULL 
                                 AND (value->>''adjusted_delivery_date'') <> '''' 
                                 AND (value->>''adjusted_delivery_date'') <> ''Invalid date''
                            THEN (value->>''adjusted_delivery_date'')::timestamp 
                            ELSE NULL 
                        END as adj_date
                    FROM jsonb_each(' || quote_literal(modifications_map::text) || '::jsonb)
                ),
                current_records AS (
                    SELECT 
                        ocr.id, 
                        ocr.article, 
                        ocr.raw_roq_cof 
                    FROM inventory_smart.oms_cof_orders_recommended ocr' || v_pa_join || '
                    INNER JOIN article_mods am ON ocr.article = am.article 
                    WHERE ' || v_search_query || '
                ),
                row_counts AS (
                    SELECT 
                        cr.article, 
                        COUNT(*) as row_count
                    FROM current_records cr 
                    GROUP BY cr.article
                ),
                record_updates AS (
                    SELECT 
                        cr.id,
                        cr.article,
                        CASE 
                            WHEN am.new_order_qty IS NULL THEN NULL
                            WHEN am.ratio IN (''Infinity'', ''NaN'', '''') OR am.ratio IS NULL THEN 
                                -- Equal distribution when ratio is Infinity, NaN, or empty
                                CASE 
                                    WHEN rc.row_count > 0 THEN CEIL(am.new_order_qty / rc.row_count)
                                    ELSE 0
                                END
                            ELSE 
                                -- Multiply raw_roq_cof by ratio
                                CEIL(COALESCE(cr.raw_roq_cof, 0)::float * am.ratio::float)
                        END as new_order_qty,
                        am.adj_date,
                        fdm.fiscal_year_week as new_fiscal_week
                    FROM current_records cr 
                    INNER JOIN article_mods am ON cr.article = am.article
                    INNER JOIN row_counts rc ON cr.article = rc.article
                    LEFT JOIN global.fiscal_date_mapping fdm ON fdm.calendar_date = am.adj_date::date
                )
                UPDATE inventory_smart.oms_cof_orders_recommended ocr 
                SET order_quantity_cof = COALESCE(ru.new_order_qty, ocr.order_quantity_cof),
                    adjusted_delivery_date = COALESCE(ru.adj_date, ocr.adjusted_delivery_date),
                    receipt_fiscal_year_week = COALESCE(ru.new_fiscal_week, ocr.receipt_fiscal_year_week)
                FROM record_updates ru 
                WHERE ocr.id = ru.id 
                  AND ocr.draft_id = ' || v_draft_id_int;
            
            RAISE NOTICE 'Executing query for order_quantity_cof and adjusted_delivery_date update (unique_row_id): %', v_query;
            EXECUTE v_query;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_total_updated := v_total_updated + v_updated_count;
        END IF;

    -- Handle loc_code or size level (direct updates, no distribution logic)
    ELSIF selection_level IN ('loc_code', 'size', 'auto') THEN
        -- Determine level if auto
        IF selection_level = 'auto' THEN
            v_query := '
                SELECT 
                    COUNT(DISTINCT ocr.loc_code), 
                    COUNT(DISTINCT ocr.size) 
                FROM inventory_smart.oms_cof_orders_recommended ocr 
                WHERE ocr.id IN (
                    SELECT (key::text)::int4 
                    FROM jsonb_each(' || quote_literal(modifications_map::text) || '::jsonb)
                ) 
                  AND ocr.draft_id = ' || v_draft_id_int;
            
            BEGIN
                EXECUTE v_query INTO v_row_count, v_updated_count;
                v_determined_level := CASE 
                    WHEN v_row_count > v_updated_count THEN 'loc_code' 
                    ELSE 'size' 
                END;
            EXCEPTION
                WHEN OTHERS THEN
                    v_determined_level := 'loc_code';
            END;
        ELSE
            v_determined_level := selection_level;
        END IF;

        -- Build article filter for WHERE clause (if provided)
        v_search_query := '';
        IF article IS NOT NULL AND article != '' THEN
            v_search_query := ' AND ocr.article = ' || quote_literal(article);
        END IF;
        
        -- Update order_quantity_cof and adjusted_delivery_date together (no distribution logic)
        -- Values come pre-distributed from frontend
        v_query := 'SELECT COUNT(*) FROM jsonb_each(' || quote_literal(modifications_map::text) || '::jsonb) WHERE (value->>''order_quantity_cof'')::numeric IS NOT NULL OR ((value->>''adjusted_delivery_date'') IS NOT NULL AND (value->>''adjusted_delivery_date'') <> '''')';
        EXECUTE v_query INTO v_row_count;
        IF v_row_count > 0 THEN
            v_query := '
                WITH record_mods AS (
                    SELECT 
                        (key::text)::int4 as record_id, 
                        (value->>''order_quantity_cof'')::numeric as order_qty,
                        CASE 
                            WHEN (value->>''adjusted_delivery_date'') IS NOT NULL 
                                 AND (value->>''adjusted_delivery_date'') <> '''' 
                            THEN (value->>''adjusted_delivery_date'')::timestamp 
                            ELSE NULL 
                        END as adj_date
                    FROM jsonb_each(' || quote_literal(modifications_map::text) || '::jsonb)
                ),
                record_updates AS (
                    SELECT 
                        rm.record_id,
                        rm.order_qty,
                        rm.adj_date,
                        fdm.fiscal_year_week as new_fiscal_week
                    FROM record_mods rm
                    LEFT JOIN global.fiscal_date_mapping fdm ON fdm.calendar_date = rm.adj_date::date
                )
                UPDATE inventory_smart.oms_cof_orders_recommended ocr 
                SET order_quantity_cof = COALESCE(ru.order_qty, ocr.order_quantity_cof),
                    adjusted_delivery_date = COALESCE(ru.adj_date, ocr.adjusted_delivery_date),
                    receipt_fiscal_year_week = COALESCE(ru.new_fiscal_week, ocr.receipt_fiscal_year_week)
                FROM record_updates ru 
                WHERE ocr.id = ru.record_id 
                  AND ocr.draft_id = ' || v_draft_id_int || v_search_query;
            
            RAISE NOTICE 'Executing query for order_quantity_cof and adjusted_delivery_date update (%): %', v_determined_level, v_query;
            EXECUTE v_query;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_total_updated := v_total_updated + v_updated_count;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid selection_level: %. Must be one of: unique_row_id, loc_code, size, auto', selection_level;
    END IF;

    v_result := jsonb_build_object(
        'status', 'success',
        'total_records_updated', v_total_updated,
        'selection_level', selection_level
    );

    RETURN v_result;

END;
$function$;
