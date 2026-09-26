--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_offcycle_unique_values_by_filters_spanx_update_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-2
--comment: updated the function to handle the product attribute filter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_offcycle_unique_values_by_filters(text, text, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_offcycle_unique_values_by_filters(
    draft_id text,
    selection_level text DEFAULT 'unique_row_id',
    product_attribute_query jsonb DEFAULT '{}'::jsonb,
    store_attribute_query jsonb DEFAULT '{}'::jsonb,
    search_columns jsonb DEFAULT '{}'::jsonb,
    date_filter jsonb DEFAULT NULL
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
    v_key text;
    v_values jsonb;
    v_result jsonb := '[]'::jsonb;
    v_column_name text;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
    v_date_filter_query text := '';
    v_filter_type text;
	v_type text;
    v_search_pattern text;
BEGIN
    -- Validate inputs
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;
    
    -- Set default selection_level if not provided
    IF selection_level IS NULL OR selection_level = '' THEN
        selection_level := 'unique_row_id';
    END IF;
    
    -- Determine column name based on selection_level
    IF selection_level = 'unique_row_id' THEN
        v_column_name := 'article';
    ELSIF selection_level IN ('loc_code', 'size') THEN
        v_column_name := selection_level;
    ELSE
        RAISE EXCEPTION 'selection_level must be one of: unique_row_id, loc_code, size';
    END IF;
    
    v_draft_id_int := draft_id::int4;
    
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

    IF v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week;
    ELSIF v_start_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week >= ' || v_start_week;
    ELSIF v_end_week IS NOT NULL THEN
        v_date_filter_query := ' AND ocr.receipt_fiscal_year_week <= ' || v_end_week;
    END IF;
    
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
    
     IF search_columns IS NOT NULL AND search_columns != '{}'::jsonb THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(search_columns)
        LOOP
            -- Check if it's a text search object format: {"filterType": "text", "type": "contains", "filter": "10233"}
            IF jsonb_typeof(v_values) = 'object' THEN
                v_filter_type := v_values->>'filterType';
                v_type := v_values->>'type';
                v_search_pattern := v_values->>'filter';
                
                IF v_filter_type = 'text' AND v_type = 'contains' AND v_search_pattern IS NOT NULL AND v_search_pattern != '' THEN
                    -- Generate ILIKE condition for text search (case-insensitive pattern matching)
                    v_search_query := v_search_query || ' AND ocr.' || v_key || '::TEXT ILIKE ' || quote_literal('%' || v_search_pattern || '%');
                END IF;
            -- Check if it's an array format: ["10233", "10234"]
            ELSIF jsonb_typeof(v_values) = 'array' AND jsonb_array_length(v_values) > 0 THEN
                v_search_query := v_search_query || ' AND ocr.' || v_key || ' IN (';
                v_search_query := v_search_query || (
                    SELECT string_agg(quote_literal(val), ',')
                    FROM jsonb_array_elements_text(v_values) AS t(val)
                );
                v_search_query := v_search_query || ')';
            END IF;
        END LOOP;
    END IF;
    
    v_where_clause := 'WHERE ocr.draft_id = ' || v_draft_id_int;

    IF v_pa_query != '' THEN
        v_where_clause := v_where_clause || ' AND EXISTS (SELECT 1 FROM global.product_attributes_filter paf 
                            WHERE paf.article = ocr.article ' || v_pa_query || ')';
    END IF;

    IF v_sa_query != '' THEN
        v_where_clause := v_where_clause || v_sa_query;
    END IF;

    IF v_search_query != '' THEN
        v_where_clause := v_where_clause || v_search_query;
    END IF;

    IF v_date_filter_query != '' THEN
        v_where_clause := v_where_clause || v_date_filter_query;
    END IF;

    v_where_clause := v_where_clause || ' AND ocr.is_approved = FALSE';
    
    v_query := 'SELECT jsonb_agg(DISTINCT ocr.' || v_column_name || ' ORDER BY ocr.' || v_column_name || ') 
                    FROM inventory_smart.oms_cof_orders_recommended ocr ' || v_where_clause;
    
    EXECUTE v_query INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
