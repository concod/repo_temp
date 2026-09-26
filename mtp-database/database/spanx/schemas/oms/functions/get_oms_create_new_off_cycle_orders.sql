--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_create_new_off_cycle_orders_update2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604.
--comment: Removed limit clause from the query
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_oms_create_new_off_cycle_orders(input refcursor, input_data jsonb, meta jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_create_new_off_cycle_orders(input refcursor, input_data jsonb, meta jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_input_data jsonb := input_data;
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
    -- input_data = '[{"article": "ART1", "loc_code": "DC1"}, {"article": "ART2", "loc_code": "DC2"}]'
    -- meta = '{"limit": {"page": 1, "limit": 10}, "sort": [{"column": "product", "order": "asc"}], "search": [...]}'
    
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
            -- Replace column names with aliases used in the subquery
            -- loc_code -> dc, article -> product
            v_where_clause := regexp_replace(v_where_clause, '\mloc_code\M', 'dc', 'g');
            v_where_clause := regexp_replace(v_where_clause, '\marticle\M', 'product', 'g');
        END IF;
        
        -- Extract ORDER BY clause (if present)
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := trim(substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)'));
            -- Remove trailing comma if present
            v_order_clause := rtrim(v_order_clause, ',');
            -- Replace column names with aliases used in the subquery
            -- loc_code -> dc, article -> product
            v_order_clause := regexp_replace(v_order_clause, '\mloc_code\M', 'dc', 'g');
            v_order_clause := regexp_replace(v_order_clause, '\marticle\M', 'product', 'g');
        END IF;
    END IF;
    
    -- Set default ORDER BY if no sort specified
    IF v_order_clause = '' THEN
        v_order_clause := 'ORDER BY product, dc';
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
            (jsonb_array_elements(' || quote_literal(v_input_data::text) || '::jsonb)::jsonb->>''article'')::varchar AS article,
            (jsonb_array_elements(' || quote_literal(v_input_data::text) || '::jsonb)::jsonb->>''loc_code'')::varchar AS loc_code
    ),
    paf_data AS MATERIALIZED (
        SELECT DISTINCT ON (paf.article)
            paf.article,
            paf.product_code,
            paf.l0_name AS brand,
            paf.l1_name AS category,
            paf.l2_name AS class,
            paf.l3_name AS subclass,
            paf.l4_name AS product_description,
            paf.launch_date,
            paf.exit_date,
            paf.product_lifecycle
        FROM global.product_attributes_filter paf
        INNER JOIN article_loc_input ali ON paf.article = ali.article
        WHERE paf.active = true
        ORDER BY paf.article, paf.product_code
    ),
    safety_stock_data AS MATERIALIZED (
        SELECT 
            ocs.article,
            ocs.loc_code,
            AVG(ocs.demand_twos)::int4 AS demand_twos,
            MAX(ocs.safety_stock_method) AS buffer_stock_addition_method,
            MAX(ocs.service_level_pct) AS service_level_pct,
            MAX(ocs.stock_units) AS safety_stock_units,
            MAX(ocs.safety_stock_twos) AS safety_stock_twos
        FROM inventory_smart.oms_constraints_safety_stock ocs
        INNER JOIN article_loc_input ali ON ocs.article = ali.article AND ocs.loc_code = ali.loc_code
        GROUP BY ocs.article, ocs.loc_code
    ),
    lead_time_data AS MATERIALIZED (
        SELECT 
            ocl.article,
            ocl.loc_code,
            ocl.lead_time,
            ocl.mode_shipment,
            ocl.default_mode
        FROM inventory_smart.oms_constraints_lead_time ocl
        INNER JOIN article_loc_input ali ON ocl.article = ali.article AND ocl.loc_code = ali.loc_code
        WHERE ocl.mode_shipment IS NOT NULL
    ),
    lead_time_default AS MATERIALIZED (
        SELECT DISTINCT ON (ocl.article, ocl.loc_code)
            ocl.article,
            ocl.loc_code,
            ocl.lead_time,
            ocl.mode_shipment
        FROM inventory_smart.oms_constraints_lead_time ocl
        INNER JOIN article_loc_input ali ON ocl.article = ali.article AND ocl.loc_code = ali.loc_code
        ORDER BY ocl.article, ocl.loc_code, ocl.id
    ),
    mode_shipments_data AS MATERIALIZED (
        SELECT 
            lt.article,
            lt.loc_code,
            jsonb_agg(
                jsonb_build_object(
                    ''shipment_mode'', lt.mode_shipment,
                    ''lead_time'', lt.lead_time,
                    ''default_mode'', lt.default_mode
                )
            ) AS shipment_modes
        FROM lead_time_data lt
        GROUP BY lt.article, lt.loc_code
    ),
    existing_drafts AS MATERIALIZED (
        SELECT DISTINCT
            draft.article,
            draft.loc_code
        FROM inventory_smart.oms_cno_off_cycle_draft draft
        WHERE draft.is_deleted = false
    )
    SELECT * FROM (
        SELECT 
            paf.article AS product,
        paf.product_code,
        paf.product_description,
        paf.brand,
        paf.category,
        paf.class,
        paf.subclass,
        ali.loc_code AS dc,
        CASE 
            WHEN paf.product_lifecycle IN (''FASHION'', ''SEASONAL FASHION'', ''SEASONAL CORE'', ''CORE FASHION'') 
            THEN paf.launch_date 
            ELSE NULL 
        END AS demand_start_date,
        CASE 
            WHEN paf.product_lifecycle IN (''FASHION'', ''SEASONAL FASHION'', ''SEASONAL CORE'', ''CORE FASHION'') 
            THEN paf.exit_date 
            ELSE NULL 
        END AS demand_end_date,
        COALESCE(ss.demand_twos, 8) AS demand_twos,
        CASE 
            WHEN paf.product_lifecycle IN (''FASHION'', ''SEASONAL FASHION'', ''SEASONAL CORE'', ''CORE FASHION'') 
            THEN ''Sell Through''
            ELSE ss.buffer_stock_addition_method 
        END AS buffer_stock_addition_method,
        ss.service_level_pct,
        ss.safety_stock_units,
        ss.safety_stock_twos AS safety_stock_wos,
        CURRENT_DATE AS order_generation_date,
        CASE 
            WHEN ltd.lead_time IS NOT NULL 
            THEN CURRENT_DATE + ltd.lead_time 
            ELSE CURRENT_DATE 
        END AS delivery_date,
        COALESCE(ltd.lead_time, 0) AS lead_time,
        COALESCE(msd.shipment_modes, jsonb_build_array()) AS shipment_modes,
        CONCAT(paf.article,''_'',ali.loc_code) AS unique_row_id,
        CASE 
            WHEN ed.article IS NOT NULL AND ed.loc_code IS NOT NULL 
            THEN true 
            ELSE false 
        END AS is_already_in_draft
    FROM article_loc_input ali
    INNER JOIN paf_data paf ON ali.article = paf.article
    LEFT JOIN lead_time_default ltd ON ali.article = ltd.article AND ali.loc_code = ltd.loc_code
    LEFT JOIN mode_shipments_data msd ON ali.article = msd.article AND ali.loc_code = msd.loc_code
    LEFT JOIN safety_stock_data ss ON ali.article = ss.article AND ali.loc_code = ss.loc_code
    LEFT JOIN existing_drafts ed ON ali.article = ed.article AND ali.loc_code = ed.loc_code
    ) X';
    
    -- Add WHERE clause (if present)
    IF v_where_clause <> '' THEN
        v_query := v_query || ' ' || v_where_clause;
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