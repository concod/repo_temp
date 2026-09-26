--liquibase formatted sql
--changeset liquibase:order_batching_summary_store_optimization runOnChange:true stripComments:false splitStatements:false context:MTP-128655 labels:MTP-128655
--comment: MTP-128655 fixed net available inventory to allocate
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.order_batching_summary_store
  * Created by: Mithun R
  * Created at: 2025-02-04
  * updated by: Gururaj Patil
  * updated at: 2026-02-23
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                        $2 = product filters str
  *                        $3 = store filters str
  *                        $4 = other filters str
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;

    _start_date_14_days date := ((CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York')::date;
    _start_date_today date := (CURRENT_DATE AT TIME ZONE 'America/New_York')::date;
    _end_date date := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York')::date;
    _current_date_plus_7_days date := ((CURRENT_DATE + INTERVAL '7 day') AT TIME ZONE 'America/New_York')::date;
	carfg_filter_start_date     text;
	carfg_filter_end_date       text;

    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
	carfg_filter_start_date := (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York';
	carfg_filter_end_date := (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York';
    _query_combine := format($$
        WITH
        product_filters AS materialized (
            SELECT DISTINCT article FROM
            global.product_attributes_filter %1$s
        )
        ,store_filters AS materialized (
            SELECT DISTINCT store_code, store_capacity, dc_store_transit_time FROM
            global.store_attributes_filter %2$s
        ),
        plan_master AS materialized (
                            SELECT
                plan_code,
                plan_code as allocation_name,
                created_at,
                CASE WHEN type in (0, 4, 5) THEN 'Manual' ELSE 'Auto' end as plan_type
              FROM
                inventory_smart.plan_master
              WHERE
                status IN (2)
                AND is_deleted = false
                AND (
        				type IN (4, 5, 12)
        			OR (
				            type IN (0, 2)
				            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
				            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
				        )
				    )
			    AND
				    created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York'
				    AND
				    created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
            ),
            filter_allocations_pre as materialized (
              select
                *
              from
                (
                  select
                  	carfg.allocation_code,
                    carfg.article,
                    carfg.retail_size_cd,
                    carfg.store,
                    carfg.store_name,
                    carfg.allocated_total,
                    carfg.inventory_source,
                    carfg.inv_avai,
                    carfg.created_at,
                    carfg.dc_codes,
                    CASE WHEN inventory_source = 'dc' THEN 'B' WHEN inventory_source = 'po' THEN 'L' WHEN inventory_source = 'ns' THEN 'S' ELSE '' END AS po_type,
                    plan_type AS allocation_type,
                    carfg.delivery_dt::timestamptz,
                    plm.allocation_name
                  from
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
                   where
                   exists (select 1 from product_filters b where carfg.article=b.article)
                   and
                    	carfg.created_at >= '%4$s'
			    		AND
			    		carfg.created_at < '%5$s'
                ) a %3$s
            )
            ,filter_allocations as materialized (
            select *
            from filter_allocations_pre a
            where exists (select 1 from store_filters c where a.store=c.store_code)
            )
            , dc_article_size_inv_source as materialized (
			select dc_codes, article, inventory_source, retail_size_cd
			from filter_allocations
			group by 1,2,3,4
            )
            , base_dc_article_2 AS materialized (
    		SELECT TRIM(BOTH '''' FROM dc_code)::text as dc_code, article, inventory_source, retail_size_cd as size
    		FROM dc_article_size_inv_source
    		CROSS JOIN UNNEST(dc_codes) AS dc_code
    		group by 1, 2, 3, 4
			)
			, base_dc_article AS (
    		SELECT  dc_code, article, size
    		FROM base_dc_article_2
    		group by 1, 2, 3
			)
			, reserved_units AS (
			SELECT
				article,
				dc_code,
				'dc' as inventory_source,
				size,
				COALESCE(sum(quantity), 0) AS reserve_quantity
			FROM
				inventory_smart.sku_dc_reserved_units a
			WHERE
				exists (SELECT 1 FROM base_dc_article b where b.article=a.article and b.dc_code::text=a.dc_code::text and b.size=a.size)
			GROUP BY
				article, dc_code, inventory_source, size
		    ), 
      sku_dc_allocated_units AS materialized (
				select * from inventory_smart.sku_dc_allocated_units('',ARRAY(SELECT DISTINCT article FROM base_dc_article))
			),
			sku_po_allocated_units AS materialized (
				select * from inventory_smart.sku_po_allocated_units('',ARRAY(SELECT DISTINCT article FROM base_dc_article))
			),
			sku_ns_allocated_units AS materialized (
				select * from inventory_smart.sku_ns_allocated_units('',ARRAY(SELECT DISTINCT article FROM base_dc_article))
			),
      allocated_units AS materialized (
    		SELECT
        		dc_code,
        		article,
				inventory_source,
				size,
        		SUM(quantity) AS quantity
    		FROM (
        		SELECT dc_code::text, article, 'dc' as inventory_source, size, quantity
        		FROM sku_dc_allocated_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.dc_code::text = sku_dc_allocated_units.dc_code::text AND b.size = sku_dc_allocated_units.size)
        		UNION ALL
        		SELECT dc_code, article, 'po' as inventory_source, size, quantity
        		FROM sku_po_allocated_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.dc_code::text = sku_po_allocated_units.dc_code::text AND b.size = sku_po_allocated_units.size)
				UNION ALL
        		SELECT dc_code::text, article, 'ns' as inventory_source, size, quantity
        		FROM sku_ns_allocated_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.dc_code::text = sku_ns_allocated_units.dc_code::text AND b.size = sku_ns_allocated_units.size)
    		) x
    		GROUP BY dc_code, article, inventory_source, size
		    )
		    , old_allocation AS (
			SELECT
				b.article,
				b.dc_code,
				a.inventory_source,
				b.size,
				COALESCE(SUM(a.quantity), 0) AS quantity
			FROM base_dc_article_2 b
			LEFT JOIN allocated_units a
        	ON a.dc_code = b.dc_code AND a.article = b.article AND a.inventory_source = b.inventory_source AND a.size = b.size
    		GROUP BY b.article, b.dc_code, a.inventory_source, b.size
		    )
		    , available_units AS (
    		SELECT
        		dc_code,
        		article,
				inventory_source,
				size,
        		SUM(oh) AS quantity_oh
    		FROM (
        		SELECT dc_code::text, article, 'dc' as inventory_source, size, oh
        		FROM inventory_smart.sku_dc_available_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.article = sku_dc_available_units.article AND b.dc_code::text = sku_dc_available_units.dc_code::text AND b.size = sku_dc_available_units.size)
        		UNION ALL
        		SELECT po_code::text AS dc_code, article, 'po' as inventory_source, size, oh
        		FROM inventory_smart.sku_po_available_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.article = sku_po_available_units.article AND b.dc_code = sku_po_available_units.po_code::text AND b.size = sku_po_available_units.size)
				UNION ALL
        		SELECT dc_code::text AS dc_code, article, 'ns' as inventory_source, size, oh
        		FROM inventory_smart.sku_ns_available_units
        		WHERE EXISTS (SELECT 1 FROM base_dc_article b WHERE b.article = sku_ns_available_units.article AND b.dc_code::text = sku_ns_available_units.dc_code::text AND b.size = sku_ns_available_units.size)
    		) x
    		GROUP BY dc_code, article, inventory_source, size
		    )
		    , avail_inv AS materialized (
			SELECT
				b.article,
				b.dc_code,
				v.inventory_source,
				b.size,
				COALESCE(SUM(v.quantity_oh), 0) AS quantity_oh
			FROM base_dc_article_2 b
    		LEFT JOIN available_units v
        	ON v.dc_code = b.dc_code AND v.article = b.article AND v.inventory_source = b.inventory_source AND v.size = b.size
    		GROUP BY b.article, b.dc_code, v.inventory_source, b.size
		    )
            ,
            capacity AS materialized (
              SELECT
                sci.store_code,
                COALESCE(saf.store_capacity, 0) AS store_capacity,
                COALESCE(saf.store_capacity, 0) - sci.total_inv AS net_available_capacity,
                sci.total_inv
              FROM
                inventory_smart.store_current_inventory sci
                LEFT JOIN store_filters saf USING(store_code)
            ),
            filter_allocations_2 AS materialized (
              select
                allocation_code,
                store,
                store_name,
                article,
                sum(allocated_total) allocated_total
              from
                filter_allocations a
              group by
                1,
                2,
                3,
                4
            ),
            valid_plan as materialized(
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
			),
			store_net_avail_valid_plan_pre as materialized(
				select
					carfg.store,
					carfg.store_name,
					carfg.allocation_code,
					carfg.inventory_source,
					sum(carfg.allocated_total) as allocated_total,
					max(carfg.delivery_dt::timestamptz) as delivery_dt
				from
					inventory_smart.create_allocation_result_flat_gurobi AS carfg
				WHERE
					carfg.created_at >= %L
			    AND carfg.created_at <= %L
			    and exists (select 1 from valid_plan pln where pln.plan_code = carfg.allocation_code)
			    group by 1,2,3,4
			),
      store_net_avail_valid_plan as materialized(
				select
					carfg.store,
					carfg.store_name,
					carfg.allocation_code,
					carfg.inventory_source,
					carfg.allocated_total,
					carfg.delivery_dt,
					coalesce(dc_store_transit_time, 0) as dc_store_transit_time
				from
					store_net_avail_valid_plan_pre AS carfg
				left join store_filters saf on saf.store_code = carfg.store
			),
			store_receival_date_validity as materialized(
				select
					store_code,
					MAX(store_receival_date) as store_receival_date,
					SUM(allocated_total) as allocated_total
				from(
					select
						a.allocation_code,
						a.store as store_code,
						(case when a.inventory_source in ('dc', 'ns')
			      			  then a.delivery_dt::timestamptz + (interval '1 day' * coalesce(a.dc_store_transit_time, 0))
							  else a.delivery_dt::timestamptz
						end) as store_receival_date,
						sum(a.allocated_total) as allocated_total
					from store_net_avail_valid_plan a
					group by a.allocation_code, a.store, a.delivery_dt, a.inventory_source, a.dc_store_transit_time
					) x
				where store_receival_date <= %L
				group by 1
			),
            article_net_inv AS materialized (
              SELECT
                b.article,
                SUM(GREATEST(COALESCE(avail.quantity_oh, 0) - COALESCE(oalloc.quantity, 0) - COALESCE(ru.reserve_quantity, 0), 0)) AS dc_net_available_inventory
              FROM base_dc_article_2 b
              LEFT JOIN old_allocation oalloc ON oalloc.article = b.article AND oalloc.dc_code = b.dc_code AND oalloc.inventory_source = b.inventory_source AND oalloc.size = b.size
              LEFT JOIN avail_inv avail ON avail.article = b.article AND avail.dc_code = b.dc_code AND avail.inventory_source = b.inventory_source AND avail.size = b.size
              LEFT JOIN reserved_units ru ON ru.article = b.article AND ru.dc_code::text = b.dc_code::text AND ru.inventory_source = b.inventory_source AND ru.size = b.size
              GROUP BY b.article
            ),
            store_alloc_stats AS materialized (
              SELECT
                store,
                store_name,
                SUM(coalesce(allocated_total, 0)) AS allocated_total,
                COUNT(DISTINCT article) AS style_count,
                COUNT(DISTINCT allocation_code) AS allocation_count
              FROM filter_allocations_2
              GROUP BY 1, 2
            ),
            store_inv AS materialized (
              SELECT
                a.store,
                SUM(COALESCE(ani.dc_net_available_inventory, 0)) AS dc_net_available_inventory
              FROM (SELECT DISTINCT store, article FROM filter_allocations_2) a
              LEFT JOIN article_net_inv ani ON ani.article = a.article
              GROUP BY 1
            ),
            store_level AS materialized (
              SELECT
                s.store,
                s.store_name,
                s.allocated_total,
                s.style_count,
                s.allocation_count,
                COALESCE(si.dc_net_available_inventory, 0) AS dc_net_available_inventory
              FROM store_alloc_stats s
              LEFT JOIN store_inv si ON si.store = s.store
            )
            SELECT
              a.store,
              a.store_name,
              a.allocated_total,
              a.style_count,
              allocation_count,
              c.store_capacity,
              coalesce(c.net_available_capacity) - coalesce(n.allocated_total,0) as net_available_capacity,
              a.dc_net_available_inventory,
              case when coalesce(c.store_capacity,0)>0 then
              (coalesce(c.total_inv,0)+ coalesce(n.allocated_total,0))/c.store_capacity else 0 end as store_to_perc_cap
            FROM
              store_level a
              LEFT JOIN capacity c ON a.store = c.store_code
              left join store_receival_date_validity n on n.store_code = a.store
    $$, _query_pa, _query_sa, _query_cus, carfg_filter_start_date, carfg_filter_end_date, _start_date_today, _end_date, _start_date_14_days, _end_date, _current_date_plus_7_days);

    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_store', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4));
    RETURN $1;
    end
$function$
;