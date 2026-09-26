--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_existing_off_cycle_draft_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604
--comment: Removed limit clause from the query
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_existing_off_cycle_draft_data(input refcursor, article_loc_mapping jsonb, meta jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_existing_off_cycle_draft_data(
    input refcursor, 
    article_loc_mapping jsonb, 
    meta jsonb DEFAULT '{}'::jsonb
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
    Returns existing draft data from oms_cno_off_cycle_draft table based on article-loc mapping
    
    Input: 
      - article_loc_mapping: JSONB array with article and loc_code combinations
        Example: '[{"article": "ART1", "loc_code": "DC1"}, {"article": "ART2", "loc_code": "DC2"}]'
      - meta: Optional JSONB for pagination, search, and sort
        Example: '{"limit": {"page": 1, "limit": 10}, "sort": [{"column": "article", "order": "asc"}], "search": [...]}'
    
    Usage:
        SELECT * FROM inventory_smart.get_oms_existing_off_cycle_draft_data(
            'result'::refcursor,
            '[{"article": "10074R-SFTND", "loc_code": "GXECO1"}]'::jsonb,
            '{}'::jsonb
        );
        FETCH ALL FROM result;
*/
DECLARE
    v_article_loc_mapping jsonb := article_loc_mapping;
    v_meta jsonb := meta;
    v_query text := '';
    v_limit_clause text := '';
    v_where_clause text := '';
    v_order_clause text := '';
    v_limit_json jsonb := NULL;
    v_search_json jsonb := NULL;
    v_meta_cls text := '';
BEGIN
    -- Validate article_loc_mapping
    IF v_article_loc_mapping IS NULL OR jsonb_array_length(v_article_loc_mapping) = 0 THEN
        RAISE EXCEPTION 'article_loc_mapping is required and must not be empty';
    END IF;
    
    -- Extract search json
    v_search_json := v_meta;
    
    -- Generate WHERE and ORDER BY clauses from search and sort
    IF v_search_json IS NOT NULL AND jsonb_typeof(v_search_json) = 'object' AND v_search_json <> '{}'::jsonb THEN
        v_meta_cls := global.form_table_query(v_search_json);
        
        -- Extract WHERE clause (if present)
        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := trim(substring(v_meta_cls FROM 'WHERE\s.*?(?=\sORDER\sBY|\sLIMIT|\sOFFSET|$)'));
            -- Remove trailing comma if present
            v_where_clause := rtrim(v_where_clause, ',');
        END IF;
        
        -- Extract ORDER BY clause (if present)
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := trim(substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)'));
            -- Remove trailing comma if present
            v_order_clause := rtrim(v_order_clause, ',');
        END IF;
    END IF;
    
    -- Set default ORDER BY if no sort specified
    IF v_order_clause = '' THEN
        v_order_clause := 'ORDER BY article, loc_code';
    END IF;
    
    -- Clean up limit clause (remove leading comma if present)
    IF v_limit_clause <> '' THEN
        v_limit_clause := trim(v_limit_clause);
        v_limit_clause := ltrim(v_limit_clause, ',');
    END IF;
    
    -- Build the main query
    v_query := '
    WITH article_loc_input AS (
        SELECT 
            (elem::jsonb->>''article'')::varchar AS article,
            (elem::jsonb->>''loc_code'')::varchar AS loc_code
        FROM jsonb_array_elements(' || quote_literal(v_article_loc_mapping::text) || '::jsonb) AS elem
    )
    SELECT 
        d.article,
        d.product_description,
        d.brand,
        d.category,
        d.class,
        d.subclass,
        d.loc_code,
        d.demand_period_selection,
        d.demand_start_date,
        d.demand_end_date,
        d.demand_twos,
        d.buffer_stock_addition_method,
        d.service_level_pct,
        d.safety_stock_units,
        d.safety_stock_wos,
        d.sell_through_pct,
        d.min_order_quantity_sku,
        d.min_order_quantity_style_color,
        d.min_order_quantity_style,
        d.order_generation_date,
        d.delivery_date,
        d.lead_time,
        CASE 
            WHEN d.shipment_mode IS NOT NULL 
            THEN jsonb_build_array(jsonb_build_object(''shipment_mode'', d.shipment_mode, ''lead_time'', d.lead_time, ''default_mode'', 1))
            ELSE jsonb_build_array()
        END AS shipment_modes,
        CONCAT(d.article, ''_'', d.loc_code) AS unique_row_id,
        d.draft_id,
        d.draft_name
    FROM inventory_smart.oms_cno_off_cycle_draft d
    INNER JOIN article_loc_input ali 
        ON d.article = ali.article 
        AND d.loc_code = ali.loc_code
    WHERE d.is_deleted = false';
    
    -- Add WHERE clause (if present)
    IF v_where_clause <> '' THEN
        v_query := v_query || ' AND ' || trim(regexp_replace(v_where_clause, '^WHERE\s+', '', 'i'));
    END IF;
    
    -- Add ORDER BY clause
    IF v_order_clause <> '' THEN
        v_query := v_query || ' ' || v_order_clause;
    END IF;

    RAISE NOTICE 'v_query: %', v_query;
    OPEN input FOR EXECUTE v_query;
    RETURN input;
END;
$function$
;

