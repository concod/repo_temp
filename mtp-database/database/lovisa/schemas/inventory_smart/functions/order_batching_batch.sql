--liquibase formatted sql
--changeset liquibase:lovisa_order_batching_batch_timezone_correction_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-93749 labels:MTP-93749
--comment: Updated timezone to Australia/Melbourne with corrected timezone handling pattern - apply AT TIME ZONE directly to timestamp columns
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
    _start_date_7_days date := ((CURRENT_DATE - INTERVAL '7 days') AT TIME ZONE 'Australia/Melbourne')::date;
    _start_date_today date := (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne')::date;
    _end_date date := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Australia/Melbourne')::date;
    _current_date_plus_7_days date := ((CURRENT_DATE + INTERVAL '7 day') AT TIME ZONE 'Australia/Melbourne')::date;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_table_filters := global.form_table_query($5);

_query_combine := format('
           CREATE unlogged TABLE if not exists product_filters_' || unique_identifier || ' AS (
                SELECT
                    article,
                    l0_name,
                    l4_name
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3
            );
            CREATE unlogged table if not exists  store_filters_'|| unique_identifier || ' AS (
                SELECT store_code FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
           CREATE unlogged TABLE if not exists  plan_master_' || unique_identifier ||' AS (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type
                FROM
                    inventory_smart.plan_master
                WHERE
                    status IN (2)
                    AND is_deleted = false
                    AND (
                            type IN (4, 5)
                        OR (
                                type IN (0, 2)
                                AND updated_at AT TIME ZONE ''Australia/Melbourne'' >= (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'')
                                AND updated_at AT TIME ZONE ''Australia/Melbourne'' < (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'' + INTERVAL ''1 day'')
                            )
                        )
                    AND
                        created_at AT TIME ZONE ''Australia/Melbourne'' >= (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'' - INTERVAL ''7 days'')
                        AND
                        created_at AT TIME ZONE ''Australia/Melbourne'' <  (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'' + INTERVAL ''1 day'')
            );
           CREATE unlogged TABLE if not exists  filter_allocations_pre_one_' || unique_identifier || ' as (
                select * from (
                    select
                        carfg.store,
                        carfg.store_name,
                        carfg.store_grade,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.max,
                        carfg.allocation_code,
                        carfg.inv_avai AS dc_available,
                        carfg.article,
                        carfg.delivery_dt::timestamptz,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.pack_dc_allocation,
                        carfg.retail_size_cd as size,
                        carfg.inventory_source,
                        CASE
                          WHEN inventory_source=''dc'' THEN ''B''
                          ELSE ''''
                        END
                        AS po_type,
                        CASE
                          WHEN plan_type in (0, 4, 5) THEN ''Manual''
                          ELSE ''Auto''
                        END
                        AS allocation_type,
                        plm.allocation_name,
                        replace(dc_codes[1], '''''''', '''') dc_codes
                    from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
                    WHERE
                    plm.created_at AT TIME ZONE ''Australia/Melbourne'' >= (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'' - INTERVAL ''7 days'')
                    AND plm.created_at AT TIME ZONE ''Australia/Melbourne'' <  (CURRENT_DATE AT TIME ZONE ''Australia/Melbourne'' + INTERVAL ''1 day'')
                ) a ' || _query_cus || '
            );
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' as (
            select
                carfg.*,
                paf.l0_name||paf.l4_name||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''Australia/Melbourne''), ''MMDDYYHHMISS'') AS release_po
            from filter_allocations_pre_one_' || unique_identifier || ' carfg
            INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article
            where EXISTS(SELECT 1 FROM store_filters_' || unique_identifier || ' saf WHERE saf.store_code = carfg.store)
            );
            -- materialized decrease performance here
            CREATE unlogged TABLE if not exists  filtered_allocations_' || unique_identifier ||' as (
                select
                    js.key as dc_code,
                    carfg.store,
                    carfg.store_name,
                    carfg.store_grade,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.max,
                    carfg.allocation_code,
                    carfg.dc_available,
                    carfg.article,
                    carfg.delivery_dt,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.release_po,
                    carfg.size,
                    carfg.inventory_source,
                    pack_data.pack_type_id,
                    pack_data.packs_allocated_qty,
                    pack_data.packs_available_qty
                FROM
                    filter_allocations_' || unique_identifier || ' carfg
                    CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
                    CROSS JOIN LATERAL (
                        SELECT
                            UNNEST((TRANSLATE((js.value->>''packs_allocated''), ''[]'', ''{}''))::text[]) AS pack_type_id,
                            UNNEST((TRANSLATE((js.value->>''packs_allocated_qty''), ''[]'', ''{}''))::numeric[]) AS packs_allocated_qty,
                            UNNEST((TRANSLATE((js.value->>''packs_available_qty''), ''[]'', ''{}''))::numeric[]) AS packs_available_qty
                    ) pack_data
            );
             CREATE unlogged TABLE if not exists  allocation_base_' || unique_identifier ||' as (
                select a.* ,
                a.packs_allocated_qty  AS allocated_qty,
                a.packs_available_qty AS available_qty
                from filtered_allocations_' || unique_identifier || ' a
            );
            create unlogged TABLE if not exists valid_plan_' || unique_identifier ||' as (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type,
                    status,
                    is_deleted
                FROM
                    inventory_smart.plan_master
                WHERE
                    ( status = 2 and is_deleted = false )
                OR  ( status = 3
                      AND updated_at AT TIME ZONE ''Australia/Melbourne'' >= %L
                      AND updated_at AT TIME ZONE ''Australia/Melbourne'' < %L
                    )
                );
            create unlogged table if not exists store_net_avail_valid_plan_' || unique_identifier ||' as(
                select
                    carfg.store,
                    carfg.store_name,
                    carfg.allocation_code,
                    carfg.inventory_source,
                    sum(carfg.allocated_total) as allocated_total,
                    max(carfg.delivery_dt::timestamptz) as delivery_dt
                from
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg
                join store_filters_' || unique_identifier ||' saf on saf.store_code = carfg.store
                WHERE
                    carfg.created_at AT TIME ZONE ''Australia/Melbourne'' >= %L
                AND carfg.created_at AT TIME ZONE ''Australia/Melbourne'' < %L
                and exists (select 1 from valid_plan_' || unique_identifier ||' pln where pln.plan_code = carfg.allocation_code)
                group by 1,2,3,4
            );
            create unlogged table if not exists store_receival_date_validity_' || unique_identifier ||'  as(
                select
                    store_code,
                    MAX(store_receival_date) as store_receival_date,
                    SUM(allocated_total) as allocated_total
                from(
                    select
                        a.allocation_code,
                        a.store as store_code,
                        a.delivery_dt::timestamptz as store_receival_date,
                        sum(a.allocated_total) as allocated_total
                    from store_net_avail_valid_plan_' || unique_identifier ||' a
                    group by a.allocation_code, a.store, a.delivery_dt, a.inventory_source
                    ) x
                where store_receival_date <= %L
                group by 1
            );
            CREATE unlogged TABLE if not exists dc_article_inventory_' || unique_identifier ||' as (
                select
                    dc_code,
                    article,
                    sum(available_qty) as available_qty,
                    SUM(allocated_qty) as allocated_qty
                from (
                    select
                        dc_code,
                        article,
                        pack_type_id,
                        size,
                        AVG(available_qty) as available_qty,
                        SUM(allocated_qty) as allocated_qty
                    from allocation_base_' || unique_identifier || '
                    GROUP BY 1, 2, 3, 4
                ) a
                group by 1, 2
            );
            CREATE unlogged TABLE if not exists reserved_units_' || unique_identifier ||' as (
                SELECT
                    article,
                    COALESCE(sum(quantity), 0) AS reserve_quantity
                FROM
                    inventory_smart.sku_dc_reserved_units a
                WHERE
                    article IN (
                        select distinct article from allocation_base_' || unique_identifier || '
                    )
                GROUP BY article
            );
',_start_date_today,_end_date,_start_date_7_days,_end_date,_current_date_plus_7_days);
raise notice '_query_combine: %', _query_combine;
           execute _query_combine;
            _query_combine := 'select
                row_number() OVER () AS unique_key, * from
                (
                select
                a.store,
                a.store_name,
                a.store_grade,
                a.article AS "style",
                dc."name" AS "dc_name",
                SUM(a.min) as "min_constraints",
                SUM(a.max) as "max_constraints",
                SUM(a.allocated_qty) as "total_allocated_units",
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty), 0)) AS "min_allocation",
                GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS "dos_allocation",
                GREATEST(AVG(dai.available_qty) - AVG(dai.allocated_qty) - AVG(COALESCE(ru.reserve_quantity,0)), 0) AS "net_dc_available",
                a.delivery_dt AS "delivery_dt",
                a.allocation_code AS "allocation_code",
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
                a.created_at AS "created_at",
                um.user_name AS "created_by"
            from
                allocation_base_' || unique_identifier || ' a
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            LEFT JOIN "global".distribution_centres dc ON dc.dc_code::text = a.dc_code::text
            LEFT JOIN dc_article_inventory_' || unique_identifier || ' dai ON dai.dc_code = a.dc_code AND dai.article = a.article
            LEFT JOIN reserved_units_' || unique_identifier || ' ru ON ru.article = a.article
            group by
                a.store,
                a.store_name,
                a.store_grade,
                a.article,
                a.delivery_dt,
                a.allocation_code,
                a.order_priority,
                a.created_at,
                um.user_name,
                dc."name" ) x
        ;';
        raise notice '--------------';
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