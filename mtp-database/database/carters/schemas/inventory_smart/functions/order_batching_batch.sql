--liquibase formatted sql
--changeset amanlakkoju:ob_release_po_changes runOnChange:true stripComments:false splitStatements:false context:MTP-93749 labels:MTP-93749 fixe3
--comment: ob_release_po_changes
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
    _start_date_14_days date := ((CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York')::date;
    _start_date_today date := (CURRENT_DATE AT TIME ZONE 'America/New_York')::date;
    _end_date date := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York')::date;
    _current_date_plus_7_days date := ((CURRENT_DATE + INTERVAL '7 day') AT TIME ZONE 'America/New_York')::date;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_table_filters := global.form_table_query($5);

_query_combine := format('
           CREATE unlogged TABLE if not exists product_filters_' || unique_identifier || ' AS (
                SELECT
                    style,
                    article,
                    l0_name,
                    l2_id,
                    l3_id,
                    l4_id
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6
            );
            CREATE unlogged table if not exists  store_filters_'|| unique_identifier || ' AS (
                SELECT store_code, store_capacity, dc_store_transit_time FROM
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
                            type IN (4, 5, 12)
                        OR (
                                type IN (0, 2)
                                AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/New_York''
                                AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
                            )
                        )
                    AND
                        created_at >= (CURRENT_DATE - INTERVAL ''14 days'') AT TIME ZONE ''America/New_York''
                        AND
                        created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
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
                        case when allocation_code like ''%%105%%'' then COALESCE(((regexp_match(carfg.allocation_code, ''_(\d+)$''))[1])::int,0) else 0 end AS split_idx,
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
                          WHEN inventory_source=''po'' THEN ''L''
                          WHEN inventory_source=''ns'' THEN ''S''
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
                    plm.created_at >= (Date(now() AT TIME ZONE ''America/New_York'' - interval ''14 day'')::timestamp )
                    AND plm.created_at <= (date(now() AT TIME ZONE ''America/New_York'' + interval ''1 day'')::timestamp)
                ) a ' || _query_cus || '
            );
            CREATE unlogged TABLE if not exists release_po_pre_' || unique_identifier || ' as (
				SELECT
    				fap.*, rid.id
				FROM filter_allocations_pre_one_' || unique_identifier || ' fap
				LEFT JOIN (
				        select po.po_code, po.article, lpi.id
				        from (
							    select distinct case when article like ''%%USA-Brick%%'' then ''USA'' else  ''CAN'' end as country,
							    po_code,
							    article
							    from inventory_smart.po_master where article like ''%%Brick%%''
							) po
							LEFT JOIN inventory_smart.launch_po_identifier lpi
	   						ON po.po_code = lpi.omnia_bulk_po_number and po.country = lpi.country
	                    group by 1,2,3
            	) rid on inventory_source = ''po'' and fap.article = rid.article and fap.dc_codes = rid.po_code
    		);
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' as (
            select
                carfg.*,
                paf.style,
                CASE
                    WHEN carfg.inventory_source=''dc'' THEN paf.l0_name||paf.l2_id||paf.l3_id||paf.l4_id||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York'')+ (carfg.split_idx || '' second'')::interval, ''MMDDYYHHMISS'')
                    WHEN carfg.inventory_source=''po'' THEN paf.l0_name||paf.l2_id||paf.l3_id||''L''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York'')+ (carfg.split_idx || '' second'')::interval, ''MMDDYYHHMISS'')||''_''||carfg.id
                    WHEN carfg.inventory_source=''ns'' THEN paf.l0_name||carfg.store||''S''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York'')+ (carfg.split_idx || '' second'')::interval, ''MMDDYYHHMISS'')
                    ELSE paf.l0_name||paf.l2_id||paf.l3_id||paf.l4_id||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York'')+ (carfg.split_idx || '' second'')::interval, ''MMDDYYHHMISS'')
                END AS release_po
            from release_po_pre_' || unique_identifier || ' carfg
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
                    carfg.style,
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
                a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
                a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
                from filtered_allocations_' || unique_identifier || ' a
                JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, size)
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
                      AND updated_at >= %L
                      AND updated_at < %L
                    )
                );
            create unlogged table if not exists store_net_avail_valid_plan_' || unique_identifier ||' as(
                select
                    carfg.store,
                    carfg.store_name,
                    carfg.allocation_code,
                    carfg.inventory_source,
                    sum(carfg.allocated_total) as allocated_total,
                    max(carfg.delivery_dt::timestamptz) as delivery_dt,
                    max(dc_store_transit_time) as dc_store_transit_time
                from
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg
                join store_filters_' || unique_identifier ||' saf on saf.store_code = carfg.store
                WHERE
                    carfg.created_at >= %L
                AND carfg.created_at <= %L
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
                        (case when a.inventory_source in (''dc'', ''ns'')
                              then a.delivery_dt::timestamptz + (interval ''1 day'' * coalesce(a.dc_store_transit_time, 0))
                              else a.delivery_dt::timestamptz
                        end) as store_receival_date,
                        sum(a.allocated_total) as allocated_total
                    from store_net_avail_valid_plan_' || unique_identifier ||' a
                    group by a.allocation_code, a.store, a.delivery_dt, a.inventory_source, a.dc_store_transit_time
                    ) x
                where store_receival_date <= %L
                group by 1
            );
             CREATE unlogged TABLE if not exists  capacity_' || unique_identifier ||' as (
                SELECT
                sci.store_code,
                COALESCE(saf.store_capacity, 0) AS store_capacity,
                coalesce(sci.total_inv,0) as total_inv,
                coalesce(b.allocated_total,0) as allocated_total,
                COALESCE(saf.store_capacity, 0) - (coalesce(sci.total_inv,0)+ coalesce(b.allocated_total,0)) as net_available_capacity,
                case when coalesce(saf.store_capacity,0)>0 then
                (coalesce(sci.total_inv,0)+ coalesce(b.allocated_total,0))/saf.store_capacity else 0 end as store_to_perc_cap
              FROM
                inventory_smart.store_current_inventory sci
                left join store_filters_' || unique_identifier || ' saf using(store_code)
                left join store_receival_date_validity_' || unique_identifier ||' b using(store_code)
            );',_start_date_today,_end_date,_start_date_14_days,_end_date,_current_date_plus_7_days);
raise notice '_query_combine: %', _query_combine;
           execute _query_combine;
            _query_combine := 'select
                row_number() OVER () AS unique_key, * from
                (
                select
                a.store,
                a.store_name,
                a.store_grade,
                a.style,
                a.release_po,
                SUM(a.min) as min,
                SUM(a.allocated_qty) as allocated_total,
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty), 0)) AS min_units_allocation,
                GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS wos_units_allocation,
                AVG(c.store_capacity) as store_capacity,
                AVG(c.store_to_perc_cap) as store_to_perc_cap,
                a.delivery_dt,
                a.allocation_code,
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
                a.created_at,
                um.user_name created_by,
                net_available_capacity
            from
                allocation_base_' || unique_identifier || ' a
            left join capacity_' || unique_identifier || ' c on a.store=c.store_code
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            group by
                a.store,
                a.store_name,
                a.store_grade,
                a.style,
                a.release_po,
                a.delivery_dt,
                a.allocation_code,
                a.order_priority,
                a.created_at,
                um.user_name,
                net_available_capacity ) x
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