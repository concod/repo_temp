--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_off_cycle_draft_by_id_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604.
--comment: Removed limit clause from the query
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_off_cycle_draft_by_id(input refcursor, draft_id int4, meta jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_off_cycle_draft_by_id(input refcursor, draft_id int4, meta jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_id int4 := draft_id;
    v_meta jsonb := meta;
    v_query text := '';
    v_limit_clause text := '';
    v_where_clause text := '';
    v_order_clause text := '';
    v_limit_json jsonb := NULL;
    v_search_json jsonb := NULL;
    v_meta_cls text := '';

BEGIN
    -- Expected format: 
    -- draft_id = 123 (integer)
    -- meta = '{"limit": {"page": 1, "limit": 10}, "sort": [{"column": "product", "order": "asc"}], "search": [...]}'
    
    -- Validate draft_id
    IF v_draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id is required';
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
    
    -- Build the main query - matching columns from get_oms_create_new_off_cycle_orders
    v_query := '
    SELECT 
        article,
        product_description,
        brand,
        category,
        class,
        subclass,
        loc_code,
        last_order_placement_date,
        last_order_quantity,
        demand_period_selection,
        demand_start_date,
        demand_end_date,
        demand_twos,
        buffer_stock_addition_method,
        service_level_pct,
        safety_stock_units,
        safety_stock_wos,
        order_generation_date,
        delivery_date,
        lead_time,
        sell_through_pct,
        CASE 
            WHEN shipment_mode IS NOT NULL 
            THEN jsonb_build_array(jsonb_build_object(''shipment_mode'', shipment_mode, ''lead_time'', lead_time, ''default_mode'', 1))
            ELSE jsonb_build_array()
        END AS shipment_modes,
        CONCAT(article, ''_'', loc_code) AS unique_row_id,
        min_order_quantity_sku,
        min_order_quantity_style_color,
        min_order_quantity_style
    FROM inventory_smart.oms_cno_off_cycle_draft
    WHERE draft_id = ' || v_draft_id || ' AND is_deleted = false';
    
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

