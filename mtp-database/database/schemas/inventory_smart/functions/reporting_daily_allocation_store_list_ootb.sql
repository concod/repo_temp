--liquibase formatted sql
--changeset liquibase:reporting_daily_allocation_store_list_ootb runOnChange:true stripComments:false splitStatements:false context:MTP-108317 labels:MTP-108317
--comment: store list query OOTB
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_store_list_ootb(
    input refcursor, 
    product_attributes jsonb, 
    store_attributes jsonb, 
    table_filters jsonb, 
    _current_date character varying,
    extra_store_attributes jsonb
);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_store_list_ootb(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    table_filters jsonb,
    _current_date character varying,
    extra_store_attributes jsonb DEFAULT '[]'::jsonb
) RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    timezone TEXT;
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_combine TEXT := '';
    _pm_filter text := '';
    _query_table_filters TEXT := '';
    _extra_store_attributes_select TEXT := '';
    _extra_store_attributes_select_prefixed TEXT := '';
    _cache_payload JSONB := jsonb_build_object('store_attributes', store_attributes, '_current_date', _current_date);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.plan_master', 'global.store_attributes_filter', 'inventory_smart.article_inventory_dashboard', 'inventory_smart.create_allocation_result_flat_gurobi'];
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _has_size_filter BOOLEAN := FALSE;
    _pd_select TEXT;
    _pd_join TEXT;
BEGIN

    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = %L::date AND status = 3 AND is_deleted = false', timezone, _current_date);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;
    
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_table_filters := global.form_table_query(table_filters);

    -- Check if a size filter is present in product_attributes
    _has_size_filter := product_attributes ? 'size';

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
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;

    -- Build dynamic SELECT clause for extra store attributes
    IF extra_store_attributes IS NOT NULL AND jsonb_array_length(extra_store_attributes) > 0 THEN
        SELECT string_agg(quote_ident(value::text), ', ')
        INTO _extra_store_attributes_select
        FROM jsonb_array_elements_text(extra_store_attributes);
        
        SELECT string_agg('saf.' || quote_ident(value::text), ', ')
        INTO _extra_store_attributes_select_prefixed
        FROM jsonb_array_elements_text(extra_store_attributes);
        
        IF _extra_store_attributes_select IS NOT NULL THEN
            _extra_store_attributes_select := ', ' || _extra_store_attributes_select;
            _extra_store_attributes_select_prefixed := ', ' || _extra_store_attributes_select_prefixed;
        END IF;
    ELSE
        _extra_store_attributes_select := '';
        _extra_store_attributes_select_prefixed := '';
    END IF;
    
    -- Build conditional size filter parts
    IF _has_size_filter THEN
        _pd_select := ', paf.size AS retail_size_cd';
        _pd_join   := ' AND pd.retail_size_cd = acb.retail_size_cd';
    ELSE
        _pd_select := '';
        _pd_join   := '';
    END IF;

    _query_combine := '
        WITH plan_master AS MATERIALIZED -- (plan_code)
        (
            SELECT  distinct plan_code
                ,name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false 
        )
        -- SELECT * FROM plan_master;
        , store_details AS  -- (store_code)
        (
            SELECT  saf.store_code
                ,saf.store_name
                ' || _extra_store_attributes_select || '
            FROM global.store_attributes_filter saf 
            ' || _query_sa || '
        )
        -- SELECT * FROM store_details;
        , product_details AS -- (article)
        (
            SELECT  DISTINCT  paf.article' || _pd_select || '
            FROM global.product_attributes_filter paf 
            ' || _query_pa || '
        )
        -- SELECT * FROM product_details;
        , allocations_calc_base AS MATERIALIZED -- (allocation_code, article, size, store)
        (
            SELECT  allocation_code
                ,article
                ,retail_size_cd
                ,store
                ,store_grade
                ,COALESCE(allocated_total,0)                                                                                                                AS allocated_total
                ,pack_dc_allocation
                ,LEAST(COALESCE(allocated_total,0)::int,GREATEST(0,COALESCE(min,0)::int - COALESCE(updated_oh_oo_it,0)::int))                               AS min_units_allocated
                ,COALESCE(allocated_total,0) - LEAST(COALESCE(allocated_total,0)::int,GREATEST(0,COALESCE(min,0)::int - COALESCE(updated_oh_oo_it,0)::int)) AS wos_units_allocated
                ,oh
                ,oo
                ,it
                ,(oh + oo + it)                                                                                                                             AS total_inventory
            FROM inventory_smart.create_allocation_result_flat_gurobi carfg
            WHERE created_at >= (' || quote_literal(_current_date) || '::date - INTERVAL ''1 day'')
            AND created_at <= (' || quote_literal(_current_date) || '::date + INTERVAL ''1 day'')
            AND allocation_code IN ( SELECT plan_code FROM plan_master) 
        )
        -- SELECT * FROM allocations_calc_base;
        SELECT  sd.store_code 
            ,sd.store_name
            ,MAX(acb.store_grade) AS store_grade
            ' || _extra_store_attributes_select || '
            ,COUNT(DISTINCT acb.article) AS article_count
            ,SUM(min_units_allocated) AS min_units_allocated
            ,SUM(wos_units_allocated) AS wos_units_allocated
            ,SUM(allocated_total)     AS allocated_total
            ,SUM(oh)                  AS oh
            ,SUM(oo)                  AS oo
            ,SUM(it)                  AS it
            ,SUM(total_inventory)     AS total_inventory
            ,sd.store_code            AS key
        FROM allocations_calc_base acb
        JOIN product_details pd ON pd.article = acb.article' || _pd_join || '
        JOIN store_details sd ON sd.store_code = acb.store
        JOIN plan_master pm ON pm.plan_code = acb.allocation_code
        GROUP BY store_code, store_name' || _extra_store_attributes_select || ';
    ';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_store_list_ootb', 'Before Return',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3,'table_filters', $4,'_current_date', $5));	
    RETURN input;
END
$function$;
