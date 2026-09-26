--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_aggregated_data_ootb runOnChange:true stripComments:false splitStatements:false context:MTP-108317 labels:MTP-108317
--comment: aggregate query OOTB
--rollback: SELECT 1
-- Drop all previous versions to avoid "function is not unique" errors
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    _current_date character varying,
    additional_kpis jsonb
);
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    _current_date character varying,
    table_filters jsonb,
    group_by_columns text[],
    enable_aggregation boolean
);
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    _current_date character varying
);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    _current_date character varying
    ) RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    timezone TEXT;
    _daily_allocation_summary_labels JSONB;
    _enable_retail_value BOOLEAN := FALSE;
    _aid_join TEXT := '';
    _aid_col TEXT := '';
    _retail_value_agg TEXT := '';
    _retail_value_sel TEXT := '';
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_store_details TEXT := '';
    _query_reserve_units TEXT := '';
    _query_allocations TEXT := '';
    _query_product_details TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    -- Get dailyAllocationSummaryLabels for 'Daily Allocation Summary Product View'
    -- This array contains all enabled KPIs for this view
    SELECT attribute_value::jsonb->'dailyAllocationSummaryLabels'
    INTO _daily_allocation_summary_labels
    FROM global.tenant_attribute_master
    WHERE name = 'Daily Allocation Summary Product View'
    AND status = TRUE
    LIMIT 1;

    -- Check if retail_value KPI is enabled by looking for its key in the labels array
    -- For future KPIs, just add similar checks: _daily_allocation_summary_labels @> '[{"key": "new_kpi"}]'
    _enable_retail_value := COALESCE(
        _daily_allocation_summary_labels @> '[{"key": "retail_value"}]'::jsonb,
        FALSE
    );

    -- Gate: only build retail_value parts if enabled in tenant configuration
    IF _enable_retail_value THEN
        DECLARE
            _price_column TEXT;
        BEGIN
            -- Dynamically detect which price column exists (price or msrp)
            SELECT column_name INTO _price_column
            FROM information_schema.columns
            WHERE table_schema = 'inventory_smart'
            AND table_name = 'article_inventory_dashboard'
            AND column_name IN ('price', 'msrp')
            LIMIT 1;
            
            -- Default to 'price' if neither found
            _price_column := COALESCE(_price_column, 'price');
            
            _aid_join := 'LEFT JOIN inventory_smart.article_inventory_dashboard aid
                              ON carfg.store = aid.store_code AND carfg.article = aid.article';
            _aid_col := ', COALESCE(carfg.allocated_total, 0) * COALESCE(aid.' || _price_column || ', 0) AS retail_value';
            _retail_value_agg := ', SUM(retail_value) AS retail_value';
            _retail_value_sel := ', retail_value';
        END;
    END IF;
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = %L::date AND status = 3 AND is_deleted = false', timezone, _current_date);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;

    _query_pa := global.form_main_table_filters('product_attributes_filter', product_filters);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_filters);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE paf.active = true';
    ELSE
        _query_pa := _query_pa || ' AND paf.active = true';
    END IF;
    IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
    
    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;
    RAISE NOTICE 'Retail value enabled --> %', _enable_retail_value;

    _query_combine := '
        WITH plan_master AS -- (plan_code)
        (
            SELECT  distinct plan_code
                ,name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false 
        )
        -- SELECT * FROM plan_master;
        , product_details AS -- (article)
        (
            SELECT  DISTINCT  paf.article 
            FROM global.product_attributes_filter paf 
            ' || _query_pa || '
        )
        -- SELECT * FROM product_details;
        , allocations_calc_base AS MATERIALIZED -- (allocation_code, article, size, store)
        (
            SELECT  1 AS id
                ,carfg.allocation_code
                ,carfg.article
                ,carfg.retail_size_cd
                ,carfg.store
                ,carfg.pack_dc_allocation
                ,LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int))                               AS min_units_allocated
                ,COALESCE(carfg.allocated_total,0) - LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int)) AS wos_units_allocated
                ,carfg.oh
                ,carfg.oo
                ,carfg.it' || _aid_col || '
            FROM inventory_smart.create_allocation_result_flat_gurobi carfg ' || _aid_join || '
            JOIN product_details pd ON carfg.article = pd.article
            WHERE carfg.created_at >= (' || quote_literal(_current_date) || '::date - INTERVAL ''1 day'')
            AND carfg.created_at <= (' || quote_literal(_current_date) || '::date + INTERVAL ''1 day'')
            AND carfg.allocation_code IN ( SELECT plan_code FROM plan_master) 
        )
        -- SELECT * FROM allocations_calc_base;
        , flat_allocation AS -- (allocation_code, article, store, dc_code, pack_type_id)
        (
            SELECT  allocation_code
                ,article
                ,store
                ,js.key AS dc_code
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) packs_available_qty
            FROM allocations_calc_base, jsonb_each
            (allocations_calc_base.pack_dc_allocation
            ) AS js
            GROUP BY  1
                    ,2
                    ,3
                    ,4
                    ,5
                    ,6
                    ,7
        )
        -- SELECT * FROM flat_allocation;
        , eaches_and_packs AS -- (allocation_code, article, store, dc_code, pack_type_id, pack_type, size?)
        (
            SELECT  fa.allocation_code
                ,fa.article
                ,fa.store
                ,fa.dc_code
                ,fa.pack_type_id
                ,CASE WHEN dpc.units_in_pack IS NULL THEN ''eaches'' ELSE ''packs'' END AS pack_type
                ,packs_available_qty * COALESCE(dpc.units_in_pack,1)                    AS available_qty
                ,packs_allocated_qty * COALESCE(dpc.units_in_pack,1)                    AS allocated_qty
            FROM flat_allocation fa
            -- LEFT JOIN ensure we retain both eaches AND packs
            LEFT JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id)
        )
        -- SELECT * FROM eaches_and_packs;
        , dc_metrics AS 
        (
            SELECT 1 AS id
                ,SUM(available_qty) AS available_qty
                ,SUM(allocated_qty) AS allocated_qty
            FROM 
            (
                SELECT  article
                    ,pack_type_id
                    ,dc_code
                    ,MAX(available_qty) AS available_qty
                    ,SUM(allocated_qty) AS allocated_qty
                FROM eaches_and_packs
                GROUP BY pack_type_id, article, dc_code
            ) x
            GROUP BY 1
        )
        , allocation_metrics AS 
        (
            SELECT  1 as id
                ,COUNT(distinct article) AS style_color_count
                ,COUNT(distinct allocation_code) AS allocation_count' || _retail_value_agg || '
            FROM allocations_calc_base
        )
        SELECT  allocation_metrics.id
            ,allocation_metrics.allocation_count
            ,allocation_metrics.style_color_count
            ,dc_metrics.allocated_qty AS unit_allocated
            ,dc_metrics.available_qty
            -- below 0 is the placeholder for reserve units
            ,dc_metrics.available_qty - dc_metrics.allocated_qty - 0 AS dc_available' || _retail_value_sel || '
        FROM allocation_metrics
        JOIN dc_metrics USING (id);
    ';
    
    RAISE NOTICE 'query combine --> %', _query_combine;
    
    OPEN input FOR EXECUTE _query_combine;
     perform  global.sp_log(v_gen_random_uuid,'inventory_smart.reporting_store_daily_allocation_aggregated_data_ootb', 'Before RETURN',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3, '_current_date',$4));
    RETURN input;
END
$function$
;