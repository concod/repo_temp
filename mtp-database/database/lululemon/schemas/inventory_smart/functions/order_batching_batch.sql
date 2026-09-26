--liquibase formatted sql
--changeset liquibase:order_batching_batch_lululemon runOnChange:true stripComments:false splitStatements:false context:MTP-115251 labels:MTP-115251
--comment: Order batching batch function for lululemon
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(input, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(refcursor, jsonb, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch(input refcursor, product_filter jsonb, store_filter jsonb, custom_filter jsonb, meta jsonb, unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    _query_table_filters text:='';
    _query_search_filters text:='';
    _cache_count int;
    _cache_payload JSONB := jsonb_build_object(
        'unique_identifier' , unique_identifier,
        'product_filter', product_filter,
        'store_filter', store_filter,
        'custom_filter', custom_filter
    );
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.order_batching_batch';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := '{inventory_smart.plan_master, inventory_smart.create_allocation_result_flat_gurobi}';
    _tuple_check boolean := false;
    _timezone text;
    _start_date_14_days date;
    _start_date_today date;
    _end_date date;
    _current_date_plus_7_days date;
    begin
    -- Fetch timezone from tenant configuration
    SELECT attribute_value::json->'value'->>'time_zone' INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;
    
    -- Default to 'America/New_York' if timezone is not found
    IF _timezone IS NULL OR _timezone = '' THEN
        _timezone := 'America/New_York';
    END IF;
    
    -- Calculate date variables using dynamic timezone
    _start_date_14_days := ((CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE _timezone)::date;
    _start_date_today := (CURRENT_DATE AT TIME ZONE _timezone)::date;
    _end_date := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE _timezone)::date;
    _current_date_plus_7_days := ((CURRENT_DATE + INTERVAL '7 day') AT TIME ZONE _timezone)::date;
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_table_filters := global.form_table_query($5);
    
_query_combine := format('
           CREATE unlogged TABLE if not exists product_filters_' || unique_identifier || ' AS (
                SELECT
                    article,
                    l1_name,
                    l2_name,
                    l3_name,
                    l4_name,
                    l5_name,
                    l6_name,
                    l7_name,
                    style_name,
                    color_name,
                    article_original
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
            );
            CREATE unlogged table if not exists  store_filters_'|| unique_identifier || ' AS (
                SELECT distinct store_code FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
           CREATE unlogged TABLE if not exists  plan_master_' || unique_identifier ||' AS (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    CASE WHEN type in (0, 4, 5) THEN ''Manual'' ELSE ''Auto'' end as plan_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                    status IN (2) 
                    AND is_deleted = false 
                    AND (
                            type IN (4, 5) 
                        OR (
                                type IN (0, 2) 
                                AND updated_at >= CURRENT_DATE AT TIME ZONE ' || quote_literal(_timezone) || '
                                AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ' || quote_literal(_timezone) || '
                            )
                        ) 
                    AND 
                        created_at >= (CURRENT_DATE - INTERVAL ''14 days'') AT TIME ZONE ' || quote_literal(_timezone) || '
                        AND 
                        created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ' || quote_literal(_timezone) || '
            );
           CREATE unlogged TABLE if not exists  filter_allocations_pre_one_' || unique_identifier || ' as (
                select * from (
                    select
                        carfg.store,
                        carfg.store_name,
                        carfg.store_grade,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.allocation_code,
                        carfg.inv_avai AS dc_available,
                        carfg.article,
                        carfg.delivery_dt::timestamptz,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.retail_size_cd as size,
                        carfg.inventory_source,
                        CASE
                          WHEN inventory_source=''dc'' THEN ''B''
                          WHEN inventory_source=''po'' THEN ''L''
                          WHEN inventory_source=''ns'' THEN ''S''
                          ELSE ''''
                        END
                        AS po_type,
                        plm.plan_type as allocation_type,
                        plm.allocation_name
                    from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
                    WHERE  
                    carfg.created_at >= (Date(now() AT TIME ZONE ' || quote_literal(_timezone) || ' - interval ''14 day'')::timestamp )
                    AND carfg.created_at <= (date(now() AT TIME ZONE ' || quote_literal(_timezone) || ' + interval ''1 day'')::timestamp)
                ) a ' || _query_cus || '
            );
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' as (
            select 
                carfg.*,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.l5_name,
                paf.l6_name,
                paf.l7_name,
                paf.style_name,
                paf.color_name,
                paf.article_original
            from filter_allocations_pre_one_' || unique_identifier || ' carfg
            INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article
            INNER JOIN store_filters_' || unique_identifier || ' saf ON saf.store_code = carfg.store
            );
            CREATE unlogged TABLE if not exists  allocation_base_' || unique_identifier ||' as (
                select 
                    a.*,
                    a.allocated_total AS allocated_qty
                from filter_allocations_' || unique_identifier || ' a
            );
            ');
raise notice '_query_combine: %', _query_combine;
           execute _query_combine;
            _query_combine := 'select
                row_number() OVER () AS unique_key, * from
                (
                select 
                a.store,
                a.store_name,
                a.store_grade,
                a.article,
                a.allocation_code,
                MAX(a.l1_name) as l1_name,
                MAX(a.l2_name) as l2_name,
                MAX(a.l3_name) as l3_name,
                MAX(a.l4_name) as l4_name,
                MAX(a.l5_name) as l5_name,
                MAX(a.l6_name) as l6_name,
                MAX(a.l7_name) as l7_name,
                MAX(a.style_name) as style_name,
                MAX(a.color_name) as color_name,
                MAX(a.article_original) as article_original,
                SUM(a.min) as min,
                SUM(a.allocated_qty) as allocated_total,
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty), 0)) AS min_units_allocation,
                GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS wos_units_allocation,
                a.delivery_dt,
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
                a.created_at,
                um.user_name created_by
            from
                allocation_base_' || unique_identifier || ' a
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            group by
                a.store,
                a.store_name,
                a.store_grade,
                a.article,
                a.allocation_code,
                a.delivery_dt,
                a.order_priority,
                a.created_at,
                um.user_name ) x
        ;';
        raise notice '--------------';
		raise notice 'final select query: %', _query_combine;
    execute 'create unlogged TABLE if not exists cache.cache_result_' || unique_identifier || ' as ' || _query_combine || ';';
    execute 'analyse "cache"."cache_result_' || unique_identifier || '";';

        IF (meta->'search') IS NOT NULL AND jsonb_array_length(meta->'search') > 0 THEN
            _query_search_filters := global.form_table_query(jsonb_build_object('search', meta->'search'));
            raise notice '_query_search_filters: %', _query_search_filters;
            _query_combine := 'SELECT COUNT(*)::bigint AS estimated_count FROM cache.cache_result_' || unique_identifier || ' ' || _query_search_filters;
        ELSE
            _query_combine :=  'SELECT reltuples::bigint AS estimated_count
            FROM pg_class
            WHERE relname = ''cache_result_' || unique_identifier || ''';';
        END IF;
        raise notice '_query_combine: %', _query_combine;
        
        execute _query_combine into _cache_count;
        raise notice 'cache count: %', _cache_count;
    OPEN input FOR EXECUTE format('SELECT *, %s as total_count FROM cache.cache_result_' || unique_identifier || '  X %s', _cache_count, _query_table_filters);
        RETURN $1;
    end
$function$
;
