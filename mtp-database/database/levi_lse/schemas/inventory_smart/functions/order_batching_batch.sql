--liquibase formatted sql
--changeset liquibase:OB setup runOnChange:true stripComments:false splitStatements:false context:MTP-126141 labels:MTP-126141
--comment: MTP-126141 | OB setup
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, text, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch(input refcursor, product_filter jsonb, store_filter jsonb, product_store_filter jsonb, custom_filter jsonb, meta jsonb, unique_identifier text, created_at character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_psa     text:='';
    _query_cus     text:='';
    _query_table_filters text:='';
    _query_search_filters text:='';
    _created_at_filter text:='';
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
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
	_query_psa := global.form_main_table_filters('product_store_attributes_filter', $4);
    _query_cus := inventory_smart.form_main_table_filters('', $5);
	_query_table_filters := global.form_table_query($6);
    --For Now Adding to custom filter, need to check for efficiency
    IF $8 IS NOT NULL AND trim($8) != '' THEN
        _created_at_filter := format('(created_at AT TIME ZONE ''UTC'')::date = %L::date', $8);
        
        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;

_query_combine = '
           CREATE unlogged TABLE if not exists product_filters_' || unique_identifier || ' AS (
                SELECT
                    article,
					display_article,
					article_description,
					l0_name,
					l1_name,
					l2_name,
                    l3_name,
					l4_name,
					l7_code as pc5,
                    CAST(avg(price) AS numeric(10,2))::integer as price
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
            );
            CREATE unlogged table if not exists  store_filters_'|| unique_identifier || ' AS (
                SELECT store_code FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
           CREATE unlogged TABLE if not exists  plan_master_'|| unique_identifier ||' AS (
            select * from (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    plan_code as allocation_code, 
                    created_at,
                    status,
                    type as plan_type,
                    CASE
					      WHEN type in (0, 4, 5) THEN ''Manual''
					      ELSE ''Auto''
					  	END
					    AS allocation_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                     status in (2,3) and
                    is_deleted = false 
                   	AND created_at >= (CURRENT_DATE - INTERVAL ''5 days'') AT TIME ZONE ''UTC''
                    AND created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''UTC''
                ) ' || _query_cus || ' 
            );
           CREATE unlogged TABLE if not exists  filter_allocations_pre_' || unique_identifier || ' as (
            	select * from (
            		select
                        carfg.store,
                        carfg.store_name,
                        carfg.store_grade,
                        carfg.allocated_total,
                        carfg.min,
						carfg.wos,
                        carfg.allocation_code,
                        carfg.inv_avai,
                        carfg.article,
                        carfg.delivery_dt::timestamptz,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.pack_dc_allocation,
                        carfg.retail_size_cd as size,
						carfg.inventory_source,
						plm.status,
                        carfg.store_cluster, 
						-- plm.created_at,
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
	                inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
	                WHERE  
					plm.created_at >= (CURRENT_DATE - INTERVAL ''5 days'') AT TIME ZONE ''UTC''
                    AND plm.created_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''UTC''
	            ) a ' ||_query_psa || '
            );

            CREATE unlogged TABLE if not exists filter_allocations_pre_one_' || unique_identifier || ' as (
            	select * from filter_allocations_pre_' || unique_identifier || ' 
				 WHERE status = 2 
            ) ;

            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' as (
			select 
				carfg.*,
				paf.display_article,
				paf.article_description,
				paf.l0_name,
				paf.l1_name,
				paf.l2_name,
				paf.l3_name,
				paf.l4_name,
				paf.price,
				paf.pc5
			from filter_allocations_pre_one_' || unique_identifier || ' carfg
			INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article
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
					carfg.wos,
                    carfg.display_article,
					carfg.article_description,
					carfg.l0_name,
					carfg.l1_name,
					carfg.l2_name,
					carfg.l3_name,
					carfg.l4_name,
					carfg.price,
					carfg.pc5,
                    carfg.allocation_code,
                    carfg.inv_avai,
                    carfg.article,
                    carfg.delivery_dt,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.size,
					carfg.po_type,
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
            CREATE unlogged TABLE if not exists allocation_base_with_out_store_filters_' || unique_identifier ||' as (
                select a.* ,dpc.pack_type,dpc.units_in_pack,
                a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
                a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty,
				a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) * (COALESCE(a.price,1)::integer) as allocated_value
                from filtered_allocations_' || unique_identifier || ' a
                JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
            );

            CREATE unlogged TABLE if not exists allocation_base_' || unique_identifier ||' as (
                select * from allocation_base_with_out_store_filters_' || unique_identifier || ' a
                where EXISTS(SELECT 1 FROM store_filters_' || unique_identifier || ' saf WHERE saf.store_code = a.store)
            );

            
            CREATE unlogged TABLE if not exists store_capacity_' || unique_identifier ||' as (
                    SELECT 
                    sci.store_code,
                    sci.total_inv

                    ,COALESCE(sf.store_capacity,0) AS store_capacity
                    ,COALESCE(sf.store_capacity,0) - sci.total_inv AS net_available_capacity
                    ,CASE 
                    WHEN COALESCE(sf.store_capacity, 0) = 0 THEN 0
                    ELSE ROUND(
                        (COALESCE(sci.total_inv, 0) / sf.store_capacity )::numeric * 100, 2
                        )
                    END AS store_percentage_to_capacity
                FROM 
                    inventory_smart.store_current_inventory sci 
                LEFT JOIN (
                    SELECT store_code, coalesce(sls_floor_capacity,0) as store_capacity 
                    FROM global.store_attributes_filter ' || _query_sa || '
                ) sf ON sci.store_code = sf.store_code            
            );
            CREATE unlogged TABLE if not exists pack_type_level_split_' || unique_identifier ||' as (
                    select
                    article,
                    l1_name as consumer,
                    l3_name as category,
                    store,
                    allocation_code,
                    dc_code,
                    pack_type_id,
                    pack_type,
                    array_agg(a.size ORDER BY a.size) AS sizes,
                    SUM(COALESCE(a.units_in_pack, 1)) AS total_units_in_pack,
                    AVG(coalesce(a.packs_allocated_qty, 0)) as packs_allocated_qty,
                    AVG(coalesce(a.packs_available_qty, 0)) as packs_available_qty
                from allocation_base_with_out_store_filters_' || unique_identifier ||' a
                group by 1, 2, 3, 4, 5, 6, 7, 8
            );

            CREATE unlogged TABLE if not exists article_store_dc_allocation_split_' || unique_identifier ||' as (
                select
                    article,
                    store,
                    dc_code,
                    allocation_code,
                    sum(case when pack_type = ''packs'' then packs_allocated_qty else 0 end) as allocated_packs,
                    sum(case when pack_type = ''eaches'' then packs_allocated_qty else 0 end) as allocated_eaches
                from pack_type_level_split_' || unique_identifier ||'
                where exists (select 1 from store_filters_' || unique_identifier || ' sf where pack_type_level_split_' || unique_identifier ||'.store = sf.store_code)
                group by article, store, dc_code, allocation_code
            );

            CREATE unlogged TABLE if not exists unfiltered_stores_allocation_totals_' || unique_identifier ||' as (
			select dc_code,pack_type_id,article, pack_type, SUM(packs_allocated_qty) as total_packs_allocated_qty
			from pack_type_level_split_' || unique_identifier ||'
			group by 1, 2, 3, 4
		    );
            CREATE unlogged TABLE if not exists dc_pack_reserves_' || unique_identifier ||' AS (
                SELECT
                    article,
                    dc_code,
                    pack_type_id,
                    SUM(COALESCE(quantity, 0)) AS reserve_quantity
                FROM
                    inventory_smart.dc_pack_reserve_quantity
                WHERE
                    article IN (
                        SELECT DISTINCT article 
                        FROM allocation_base_' || unique_identifier || '
                    )
                GROUP BY article, dc_code, pack_type_id
            );
            CREATE unlogged TABLE if not exists dc_available_inventory_' || unique_identifier ||' AS (
                SELECT
                    ab.dc_code,
                    ab.article,
                    ab.consumer,
                    ab.category,
                    ab.pack_type_id,
                    ab.pack_type,
                    MAX(packs_available_qty) as packs_available_qty,
                    MAX(COALESCE(uat.total_packs_allocated_qty, 0)) as total_packs_allocated_qty,
                    MAX(COALESCE(dcpr.reserve_quantity, 0)) as reserve_quantity,
                    MAX(total_units_in_pack) as total_units_in_pack,
                    GREATEST(
                        MAX(packs_available_qty) -  MAX(COALESCE(uat.total_packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
                        0
                    ) as net_available_packs,
                    GREATEST(
                        MAX(packs_available_qty) -  MAX(COALESCE(uat.total_packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
                        0
                    ) * MAX(total_units_in_pack) as net_available_total
                FROM pack_type_level_split_' || unique_identifier || ' ab
                LEFT JOIN dc_pack_reserves_' || unique_identifier || ' dcpr ON dcpr.article = ab.article and dcpr.dc_code::text=ab.dc_code::text and dcpr.pack_type_id=ab.pack_type_id
                LEFT JOIN unfiltered_stores_allocation_totals_' || unique_identifier || ' uat ON uat.dc_code = ab.dc_code and uat.article = ab.article and uat.pack_type_id = ab.pack_type_id and uat.pack_type = ab.pack_type
                GROUP BY ab.dc_code, ab.article, ab.pack_type_id, ab.pack_type, ab.consumer, ab.category
            );
            CREATE unlogged TABLE if not exists dc_available_summary_' || unique_identifier ||' AS  (
                SELECT
                    dc_code,
                    article,
                    consumer,
                    category,
                    SUM(CASE WHEN pack_type = ''eaches'' THEN net_available_packs ELSE 0 END) as dc_article_level_eaches_available,
                    SUM(CASE WHEN pack_type = ''packs'' THEN net_available_packs ELSE 0 END) as dc_article_level_packs_available,
                    SUM(net_available_total) as net_available_total
                FROM dc_available_inventory_' || unique_identifier || '
                GROUP BY dc_code, consumer, category, article
            );
			CREATE unlogged TABLE if not exists unfiltered_plans_store_allocated_total_' || unique_identifier ||' as (
				select
					carfg.store,
					carfg.allocated_total,
					plm.status,
					carfg.created_at
				from inventory_smart.create_allocation_result_flat_gurobi AS carfg
				inner join inventory_smart.plan_master plm on plm.plan_code = carfg.allocation_code
				inner join store_filters_' || unique_identifier || ' sf on sf.store_code = carfg.store
				WHERE  
				carfg.created_at >= (CURRENT_DATE - INTERVAL ''5 days'') AT TIME ZONE ''UTC''
				AND carfg.created_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''UTC''
				AND plm.status in (2,3)
			);
			CREATE unlogged TABLE if not exists ob_data_' || unique_identifier ||' as (
				SELECT store, SUM(allocated_total) AS ob
				FROM unfiltered_plans_store_allocated_total_' || unique_identifier ||'
				WHERE status = 2
				GROUP BY store
			);
			CREATE unlogged TABLE if not exists finalized_data_' || unique_identifier ||' as (
				SELECT store, SUM(allocated_total) AS finalized
				FROM unfiltered_plans_store_allocated_total_' || unique_identifier ||'
				WHERE status = 3
				  AND (created_at AT TIME ZONE ''UTC'')::date = ' || quote_literal($8) || '::date
				GROUP BY store
			);
			CREATE unlogged TABLE if not exists vir_reservation_remaining_' || unique_identifier ||' as (
                select
                    article,
                    dc_code,
                    max(aic.vir_reservation_remaining) as vir_reservation_remaining
                from
                    inventory_smart.article_inventory_constraint aic
                where exists (select 1 from filter_allocations_' || unique_identifier ||' b where aic.article=b.article)
                group by article, dc_code

            );';
 raise notice '_query_combine: %', _query_combine;
           execute _query_combine;

            _query_combine := 'select
				row_number() OVER () AS unique_key, * from
                (
                                select 
                a.store,
                a.store_name,
                a.store_grade,
                a.display_article::text as display_article,
				a.article_description,
				ps.store_cluster,
				a.l1_name,
				a.l3_name,
				a.article,
				a.pc5,
				AVG(COALESCE(a.wos,0)) as wos,
                a.dc_code,
				dc.name as dc_name,
                COALESCE(ROUND(AVG(asdas.allocated_eaches),0),0) as store_product_level_eaches,
                COALESCE(ROUND(AVG(asdas.allocated_packs),0),0) as store_product_level_packs,
				AVG(COALESCE(vir.vir_reservation_remaining,0)) as vir_reservation_remaining,
                SUM(CASE WHEN pack_type = ''eaches'' THEN min ELSE 0 END) as min,
				ROUND(AVG(COALESCE(dcs.net_available_total,0))::numeric,0) as available_total,
				ROUND(AVG(COALESCE(dcs.dc_article_level_eaches_available,0))::numeric,0) as store_product_level_eaches_available,
				ROUND(AVG(COALESCE(dcs.dc_article_level_packs_available,0))::numeric,0) as store_product_level_packs_available,
                SUM(COALESCE(a.allocated_qty,0)) as allocated_total,
				SUM(COALESCE(a.allocated_value,0)) as allocated_value,
				GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS wos_units_allocation,
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty), 0)) AS min_units_allocation,
				a.created_at,
                um.user_name as created_by,
                a.delivery_dt,
                a.allocation_code,
                AVG(coalesce(sc.store_capacity, 0))::int AS store_capacity,
                ROUND((AVG(sc.net_available_capacity)::numeric - COALESCE(AVG(ob_data.ob), 0)::numeric - COALESCE(AVG(finalized_data.finalized), 0)::numeric)::numeric, 0) AS net_available_capacity,
				ROUND(
				  CASE 
				    WHEN COALESCE(AVG(saf.sls_floor_capacity), 0)::numeric = 0 THEN 0
			    ELSE 
			      (COALESCE(AVG(sc.total_inv), 0)::numeric
			       + COALESCE(AVG(ob_data.ob), 0)::numeric
			       + COALESCE(AVG(finalized_data.finalized), 0)::numeric) / NULLIF(AVG(saf.sls_floor_capacity)::numeric, 0)
			  END::numeric, 3)*100
				AS store_percentage_to_capacity

             FROM
                allocation_base_' || unique_identifier || ' a
	            LEFT JOIN global.user_master um ON um.user_code = a.created_by
                LEFT JOIN article_store_dc_allocation_split_' || unique_identifier ||' asdas ON asdas.article = a.article AND asdas.store = a.store AND asdas.dc_code::text = a.dc_code::text AND asdas.allocation_code = a.allocation_code
                LEFT JOIN (
    				SELECT DISTINCT l0_name, l1_name, store_code, store_cluster
    				FROM global.product_store_attributes_filter
				) ps
  				ON a.l0_name = ps.l0_name AND a.l1_name = ps.l1_name AND a.store = ps.store_code
				LEFT JOIN vir_reservation_remaining_' || unique_identifier ||' vir on a.article=vir.article and a.dc_code::text=vir.dc_code::text
				LEFT JOIN global.distribution_centres dc on a.dc_code::text=dc.dc_code::text
				LEFT JOIN dc_available_summary_' || unique_identifier ||' dcs on a.dc_code::text=dcs.dc_code::text and a.l1_name=dcs.consumer and a.l3_name=dcs.category and a.article = dcs.article
                LEFT JOIN store_capacity_' || unique_identifier ||' sc on a.store=sc.store_code
				LEFT JOIN global.store_attributes_filter saf  on a.store=saf.store_code
                --LEFT JOIN filter_allocations_pre_one_' || unique_identifier ||' fapo on a.store=fapo.store_code
                LEFT JOIN ob_data_' || unique_identifier ||' ob_data on a.store=ob_data.store
                LEFT JOIN finalized_data_' || unique_identifier ||' finalized_data on a.store=finalized_data.store
				group by
				a.store,
                a.dc_code,
                a.store_name,
                a.store_grade,
                a.display_article::text,
				a.article_description,
				ps.store_cluster,
				a.l1_name,
				a.l3_name,
				a.pc5,
				dc.name,
                a.created_at,
                um.user_name,
                a.delivery_dt,
                a.allocation_code,
                a.article ) x
        ;';
raise notice '_query_combine: %', _query_combine;

        raise notice '--------------';

	execute 'create unlogged TABLE if not exists cache.cache_result_' || unique_identifier || ' as ' || _query_combine || ';';
	execute 'analyse "cache"."cache_result_' || unique_identifier || '";';

        IF ((meta->'search') IS NOT NULL AND jsonb_array_length(meta->'search') > 0) 
           OR ((meta->'range') IS NOT NULL AND jsonb_array_length(meta->'range') > 0) THEN            
           _query_search_filters := global.form_table_query(jsonb_build_object('search', meta->'search') || jsonb_build_object('range', meta->'range'));
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
