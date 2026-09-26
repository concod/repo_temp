--liquibase formatted sql
--changeset liquibase:MTP-70495 runOnChange:true stripComments:false splitStatements:false context:MTP-75197 labels:MTP-75197
--comment: MTP-75197 adding plan name column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(input, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(refcursor, jsonb, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch(input refcursor, product_filter jsonb, store_filter jsonb, custom_filter jsonb, meta jsonb, unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_batch
  * Created by: Suba Selvandran N
  * Created at: 23-May-2023
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = custom filter str
                            $4 = meta filter jsonb
                            $5 = unique_identifier
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Mithun R         8-JAN-2025     Initial version
  * Nibeel Yunus    10-FEB-2025     MTP-70495:Pagination on Order Batching Screen
  *
  */
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

    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
	_query_table_filters := global.form_table_query($5);
        _query_combine = '
           CREATE unlogged TABLE if not exists product_filters_' || unique_identifier || ' AS (
                SELECT
                    article,
                    l0_name,
                    l2_id,
                    l3_id,
                    l4_id
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5
            );
            CREATE unlogged TABLE if not exists store_filters_' || unique_identifier || '  AS (
                SELECT store_code, store_tier , store_attribute_1 FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
            CREATE unlogged TABLE if not exists plan_master_' || unique_identifier || ' AS (
                SELECT 
                    plan_code,
                    name as allocation_name,
                    created_at,
                    type as plan_type
                FROM 
                    inventory_smart.plan_master
                    where status in (2)
                    and (type in (4, 5) or (type in (0, 2) and updated_at between (Date(now() AT TIME ZONE ''America/New_York'')::timestamp) and (Date(now() AT TIME ZONE ''America/New_York'' + interval ''1 day'')::timestamp)))
                    AND is_deleted = false
            );
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' AS (
            	select * from (
            		select
                        carfg.store,
                        carfg.store_name,
                        carfg.store_grade,
                        saf.store_tier,
                        saf.store_attribute_1,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.allocation_code,
                        carfg.inv_avai AS dc_available,
                        carfg.article,
                        carfg.delivery_dt,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.pack_dc_allocation,
                        retail_size_cd as size,
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
					    plm.allocation_name
	            	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    INNER JOIN store_filters_' || unique_identifier || ' saf ON saf.store_code = carfg.store
                	INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article
	                inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
	                WHERE  EXISTS(SELECT 1 FROM store_filters_' || unique_identifier || ' saf WHERE saf.store_code = carfg.store)
					AND plm.created_at >= (Date(now() AT TIME ZONE ''America/New_York'' - interval ''14 day'')::timestamp )
                    AND plm.created_at <= (date(now() AT TIME ZONE ''America/New_York'' + interval ''1 day'')::timestamp)
						and allocation_code is not null
	            ) a ' || _query_cus || '
            );
            -- materialized decrease performance here
            CREATE unlogged TABLE if not exists filtered_allocations_' || unique_identifier || ' AS (
            	select
                    js.key as dc_code,
                    carfg.store,
                    carfg.store_name,
                    carfg.store_grade,
                    carfg.store_tier,
                    carfg.store_attribute_1,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.allocation_code,
					carfg.allocation_name,
                    carfg.dc_available,
                    carfg.article,
                    carfg.delivery_dt,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.size,
                    pack_data.pack_type_id,
				    pack_data.packs_allocated_qty,
				    pack_data.packs_available_qty,
				    pack_data.pack_rounding_factor
				FROM
				    filter_allocations_' || unique_identifier || ' carfg
				    CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
				    CROSS JOIN LATERAL (
				        SELECT 
				            UNNEST((TRANSLATE((js.value->>''packs_allocated''), ''[]'', ''{}''))::text[]) AS pack_type_id,
				            UNNEST((TRANSLATE((js.value->>''packs_allocated_qty''), ''[]'', ''{}''))::numeric[]) AS packs_allocated_qty,
				            UNNEST((TRANSLATE((js.value->>''packs_available_qty''), ''[]'', ''{}''))::numeric[]) AS packs_available_qty,
				            UNNEST((TRANSLATE((js.value->>''pack_rounding_factor''), ''[]'', ''{}''))::numeric[]) AS pack_rounding_factor
				    ) pack_data
            );
            CREATE unlogged TABLE if not exists allocation_base_' || unique_identifier || ' AS (
                select a.* ,
                -- a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
                case when pack_type =''eaches''
                then
                    a.packs_allocated_qty * (COALESCE(a.pack_rounding_factor,1)::integer)
                else
                    a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer)
			    end as allocated_qty,
                -- a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
                case when pack_type =''eaches''
                then
                    a.packs_available_qty * (COALESCE(a.pack_rounding_factor,1)::integer)
                else
                    a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer)
			    end as available_qty
                from filtered_allocations_' || unique_identifier || ' a
                JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, size)
            );
            --  capacity as (
            --     select 
            --         sci.store_code, 
            --         coalesce(saf.store_capacity,0) as store_capacity, 
            --         case when coalesce(saf.store_capacity,0)>0 then (sci.total_inv/saf.store_capacity) else 0 end as store_to_perc_cap 
            --     from inventory_smart.store_current_inventory sci 
            --     left join store_filters saf using(store_code)
            -- ),
            CREATE unlogged TABLE if not exists reserved_units_' || unique_identifier || ' AS (
                select
                    article,
                    coalesce(sum(quantity),
                    0) as reserve_quantity
                from
                    inventory_smart.dc_pack_reserve_quantity
                where
                    article in (
                        select
                            article
                        from
                            filter_allocations_' || unique_identifier || '
                        group by 1
                    )
                group by
                    article
            );
            CREATE unlogged TABLE if not exists dc_inv_' || unique_identifier || ' AS (
                select
                    allocation_code,
                    article,
                    dc_code,
                    sum(available_qty) as available_qty,
                    SUM(allocated_qty) as allocated_qty
                from (
                    select 
                        allocation_code,
                        article,
                        dc_code,
                        pack_type_id,
                        size,
                        AVG(available_qty) as available_qty,
                        SUM(allocated_qty) as allocated_qty
                    from allocation_base_' || unique_identifier || '
                    GROUP BY 1, 2, 3, 4, 5
                ) a
                group by 1, 2, 3
            );';

            raise notice '_query_combine: %', _query_combine;
            execute _query_combine;
            _query_combine := 'select
                row_number() OVER () AS unique_key,
                a.store,
                a.store_name,
                a.store_grade,
                a.store_tier,
                a.store_attribute_1,
                a.article,
                --a.dc_code,
                coalesce(SPLIT_PART(dc.linked_store_code, ''_'', 1), a.dc_code) AS dc_code,
                dc."name" as dc_name,
                SUM(a.min) as min,
                SUM(a.allocated_qty) as allocated_total,
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty) , 0)) AS min_units_allocation,
                GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS wos_units_allocation,
                GREATEST(AVG(di.available_qty) - AVG(di.allocated_qty) - AVG(ru.reserve_quantity), 0) AS dc_net_available_inventory,
                -- AVG(c.store_capacity) as store_capacity,
                -- AVG(c.store_to_perc_cap) as store_to_perc_cap,
                a.delivery_dt,
                a.allocation_code,
				a.allocation_name,
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
                a.created_at,
                --a.created_by,
                um.user_name created_by
            from
                allocation_base_' || unique_identifier || ' a
            join dc_inv_' || unique_identifier || ' di using (allocation_code, article, dc_code)
            left join reserved_units_' || unique_identifier || ' ru on a.article=ru.article
            -- left join capacity c on a.store=c.store_code
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            left join "global".distribution_centres dc on dc.dc_code::text = a.dc_code::text
            group by 
                dc.linked_store_code,
                a.store, 
                a.store_name, 
                a.store_grade, 
                a.store_tier,
                a.store_attribute_1,
                a.article,
                dc."name",
                a.delivery_dt, 
                a.allocation_code,
				a.allocation_name,
                a.order_priority, 
                a.created_at,
                --a.created_by,
                um.user_name,
                a.dc_code
        ;';
        
        raise notice '--------------';

        _query_combine := 'create unlogged TABLE if not exists cache.cache_result_' || unique_identifier || ' as ' || _query_combine || ';';
        raise notice '_query_combine: %', _query_combine;
        execute _query_combine;
            
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
