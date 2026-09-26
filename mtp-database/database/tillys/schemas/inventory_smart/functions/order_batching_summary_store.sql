--liquibase formatted sql
--changeset tillys:order_batching_summary_store_date_bounds_fix runOnChange:true stripComments:false splitStatements:false context:MTP-TILLYS-OB labels:MTP-TILLYS-OB
--comment: Order batching summary by store for Tilly's — same OB unpack/join/reserve logic as order_batching_summary_style (jsonb_array_elements_text, article+size dpc, cfg reserves); America/New_York TZ; Levi's-style (CURRENT_DATE ± interval) AT TIME ZONE for plan/carfg (30-day); DC-only PO commented
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_store(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * inventory_smart.order_batching_summary_store — Tilly's OB summary (store grain)
  * Params: $1 refcursor, $2 product filter jsonb, $3 store filter jsonb, $4 custom filter jsonb
  *
  * Output columns align with table_configurations_mapping tc 1600 (channel_id_name … net_available_capacity).
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
        WITH
		product_filters AS materialized (
			SELECT DISTINCT article FROM
			global.product_attributes_filter %1$s
		)
		,store_filters AS materialized (
			SELECT DISTINCT
				store_code,
				store_name,
				channel_id_name,
				region_id_name,
				district_id_name,
				store_category,
				geo_region,
				state,
				city
			FROM
				global.store_attributes_filter %2$s
		),
		suc_agg AS materialized (
			SELECT store_code, COALESCE(SUM(unit_capacity), 0)::float8 AS store_capacity
			FROM inventory_smart.store_unit_capacity
			GROUP BY store_code
		),
		inv_agg AS materialized (
			SELECT
				store_code,
				SUM(COALESCE(oh, 0) + COALESCE(oo, 0) + COALESCE(it, 0))::float8 AS total_inv
			FROM inventory_smart.latest_inventory
			GROUP BY store_code
		),
		capacity AS materialized (
			SELECT
				sf.store_code,
				COALESCE(suc.store_capacity, 0) AS store_capacity,
				COALESCE(suc.store_capacity, 0) - COALESCE(inv.total_inv, 0) AS net_available_capacity,
				COALESCE(inv.total_inv, 0) AS total_inv
			FROM store_filters sf
			LEFT JOIN suc_agg suc ON suc.store_code = sf.store_code
			LEFT JOIN inv_agg inv ON inv.store_code = sf.store_code
		),
		plan_master AS materialized (
		    select * from (
		        SELECT
		        	plan_code,
		            plan_code as allocation_name,
		            created_at,
		            type as plan_type,
					status,
		            CASE
				      WHEN type in (0, 4, 5) THEN 'Manual'
				      ELSE 'Auto'
				  	END
				    AS allocation_type
		        FROM inventory_smart.plan_master
		        WHERE  status IN (2)
	                AND is_deleted = false
	                AND (
	        				type IN (4, 5)
	        			OR (
					            type IN (0, 2)
					            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
					            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
					        )
					    )
				    AND
				    created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/New_York'
				    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
		    ) x
		)
		,plan_master_finalised AS materialized (
		    select * from (
		        SELECT
		        	plan_code,
		            plan_code as allocation_name,
		            created_at,
		            type as plan_type,
		            status,
		            CASE
				      WHEN type in (0, 4, 5) THEN 'Manual'
				      ELSE 'Auto'
				  	END
				    AS allocation_type
		        FROM inventory_smart.plan_master
		        WHERE  status IN (3)
		            AND is_deleted = false
		            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
		            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
		    ) x
		)
		,final_plan_master AS materialized (
			SELECT * FROM plan_master
			UNION ALL
			SELECT * FROM plan_master_finalised
		)
		,unfiltered_plans_store_allocated_total AS (
			select
				carfg.store,
				carfg.allocated_total,
				carfg.created_at,
				plm.status
			from inventory_smart.create_allocation_result_flat_gurobi AS carfg
			inner join final_plan_master plm on plm.plan_code = carfg.allocation_code
			inner join store_filters sf on sf.store_code = carfg.store
			WHERE
			carfg.created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/New_York'
			AND carfg.created_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
		)
		,ob_data AS (
			SELECT store as store_code, SUM(allocated_total) AS ob
			FROM unfiltered_plans_store_allocated_total a
			GROUP BY store_code
		)
		,filter_allocations_pre_base as materialized (
        	select * from (
        		select
            		carfg.*,
            		CASE
				      WHEN inventory_source='dc' THEN 'B'
				      WHEN inventory_source='po' THEN 'L'
				      WHEN inventory_source='ns' THEN 'S'
				      ELSE ''
				  	END
				    AS po_type,
				    plm.allocation_type,
				    plm.allocation_name
            	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
				INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
				where
					exists (select 1 from product_filters b where carfg.article=b.article)
					AND carfg.created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/New_York'
					AND carfg.created_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
            ) a %3$s
        ),
		filter_allocations_pre as materialized (
                select * from filter_allocations_pre_base
            ),
		filter_allocations as materialized (
			select * from (
				SELECT
					js.key as dc_code,
					store,
					allocated_total,
					style,
					allocation_code,
					inv_avai AS dc_available,
					article,
					retail_size_cd as size,
					jsonb_array_elements_text(js.value->'packs_allocated')::text AS pack_type_id,
					jsonb_array_elements_text(js.value->'packs_allocated_qty')::numeric AS packs_allocated_qty,
					jsonb_array_elements_text(js.value->'packs_available_qty')::numeric AS packs_available_qty
				FROM
					filter_allocations_pre
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
			) x
			where size = pack_type_id
		),
		allocation_base_with_out_store_filters AS materialized (
			select a.* ,
			dpc.pack_type,
			dpc.units_in_pack,
			a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
			a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
			from filter_allocations a
			JOIN inventory_smart.dc_pack_configuration dpc USING (article, size)
		),
		allocation_base AS materialized (
			select a.*,
			sf.store_name as store_name
			from allocation_base_with_out_store_filters a
			INNER JOIN store_filters sf ON a.store = sf.store_code
		),
		base_dc_article AS materialized (
			SELECT dc_code, article
			FROM allocation_base
			GROUP BY 1, 2
		),
		base_article AS materialized (
			SELECT  article
			FROM allocation_base
			GROUP BY 1
		),
		base_dpc as materialized (
			select article, size, sum(units_in_pack) as units_in_pack
			from inventory_smart.dc_pack_configuration dpc
			where exists (select 1 from base_article b where dpc.article=b.article)
			group by 1,2
		),
		allocated_units_dc AS materialized (
			select
				dc_code,
				article,
				sum(overall_allocated) AS overall_allocated,
				sum(eaches_allocated) AS eaches_allocated,
				sum(packs_allocated) AS packs_allocated
			from (
				select
					allocation_code,
					dc_code,
					article,
					size,
					packs_allocated,
					sum(quantity) AS overall_allocated,
					sum(eaches_allocated) AS eaches_allocated
				from
					(
					SELECT
						allocation_code,
						dc_code::text,
						article,
						size,
						quantity,
						quantity AS eaches_allocated,
						0 AS packs_allocated
					FROM inventory_smart.sku_dc_allocated_units a
					left join base_dpc c using (article, size)
					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
					) x
				GROUP BY 1, 2, 3, 4, 5
			) a
			group by 1,2
		),
--		allocated_units_po AS materialized (
--			select
--				dc_code,
--				article,
--				sum(overall_allocated) AS overall_allocated,
--				sum(eaches_allocated) AS eaches_allocated,
--				sum(packs_allocated) AS packs_allocated
--			from (
--				select
--					dc_code,
--					article,
--					pack_type_id,
--					packs_allocated,
--					sum(overall_allocated) AS overall_allocated,
--					sum(eaches_allocated) AS eaches_allocated
--				from
--					(
--					SELECT
--						dc_code::text,
--						article,
--						pack_type_id,
--						case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
--						case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated,
--						sum(quantity) as overall_allocated
--					FROM inventory_smart.sku_po_allocated_units a
--					left join base_dpc c using (article, pack_type_id)
--					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
--					group by 1,2,3,4,5
--					) x
--				GROUP BY 1, 2, 3,4
--			) a
--			group by 1,2
--		),
		allocated_units as materialized (
			select * from allocated_units_dc
--			union all
--			select * from allocated_units_po
		),
		available_units_dc as materialized (
			select dc_code, article,
				sum(eaches_available) as eaches_available,
				sum(packs_available) as packs_available,
				sum(overall_available) as overall_available
			from(
				select dc_code, article, size,
					sum(eaches_available) as eaches_available,
					avg(packs_available) as packs_available,
					sum(overall_available) as overall_available
				from (
					select
						a.article,
						a.dc_code::text,
						a.size,
						a.oh as eaches_available,
						0::numeric as packs_available,
						a.oh as overall_available
					from inventory_smart.sku_dc_available_units a
					left join base_dpc dpc using(article, size)
					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		),
--		available_units_po as materialized (
--			select dc_code, article,
--				sum(eaches_available) as eaches_available,
--				sum(packs_available) as packs_available,
--				sum(overall_available) as overall_available
--			from(
--				select dc_code, article, pack_type_id,
--					sum(eaches_available) as eaches_available,
--					avg(packs_available) as packs_available,
--					sum(overall_available) as overall_available
--				from (
--					select
--						a.article,
--						a.po_code::text as dc_code,
--						a.pack_type_id,
--						case when dpc.pack_type='eaches' then a.oh_eaches else 0 end as eaches_available,
--						case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
--						a.oh as overall_available
--					from inventory_smart.sku_po_available_units a
--					left join base_dpc dpc using(article,pack_type_id)
--					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.po_code::text)
--				) a
--				group by 1,2,3
--			) b
--			group by 1,2
--		),
		available_units as materialized (
			select * from available_units_dc
--			union all
--			select * from available_units_po
		),
		reserve_units_dc as materialized (
			select dc_code, article,
				sum(eaches_reserved) as eaches_reserved,
				sum(packs_reserved) as packs_reserved,
				sum(overall_reserved) as overall_reserved
			from(
				select dc_code, article, size,
					sum(eaches_reserved) as eaches_reserved,
					avg(packs_reserved) as packs_reserved,
					sum(overall_reserved) as overall_reserved
				from (
					select
						paf.article,
						pmpd.dc_code::text,
						cfg.size,
						drq.quantity AS eaches_reserved,
						0 AS packs_reserved,
						drq.quantity * coalesce(cfg.units_in_pack,1) AS overall_reserved
					from inventory_smart.dc_reserve_quantity drq
					join global.product_mapping_product_dc pmpd using (product_code, dc_code)
					join global.product_attributes_filter paf using (product_code)
					left join inventory_smart.dc_pack_configuration cfg ON cfg.article = paf.article AND cfg.pack_type_id = drq.pack_type_id
					where (drq.reservation_till_date is null or drq.reservation_till_date >= (now() at time zone 'America/New_York')::date)
					and exists (select 1 from base_dc_article b where b.article = paf.article and b.dc_code::text = pmpd.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		),
		net_available as materialized (
			select
				a.dc_code,
				a.article,
				a.eaches_available,
				coalesce(b.eaches_allocated,0) as eaches_allocated ,
				coalesce(c.eaches_reserved,0) as eaches_reserved,
				greatest(a.eaches_available - coalesce(b.eaches_allocated,0) - coalesce(c.eaches_reserved,0),0) as net_eaches_available,
				a.packs_available,
				coalesce(b.packs_allocated,0) as packs_allocated,
				coalesce(c.packs_reserved,0) as packs_reserved,
				greatest(a.packs_available - coalesce(b.packs_allocated,0) - coalesce(c.packs_reserved,0),0) as net_packs_available,
				a.overall_available,
				coalesce(b.overall_allocated,0) as overall_allocated,
				coalesce(c.overall_reserved,0) as overall_reserved,
				greatest(a.overall_available - coalesce(b.overall_allocated,0) - coalesce(c.overall_reserved,0),0) as net_overall_available
			from available_units a
			left join allocated_units b using (article,dc_code)
			left join reserve_units_dc c using(article,dc_code)
		),
		article_store_dc_mapping as (
			select distinct ab.article, ab.store as store_code, ab.dc_code
			from allocation_base ab
			INNER JOIN store_filters sf ON ab.store = sf.store_code
		),
		store_level_final_inv as materialized (
			select store_code,
				sum(net_eaches_available) as net_eaches_available,
				sum(net_packs_available) as net_packs_available,
				sum(net_overall_available) as net_overall_available
			from (
				select
					a.*,
					coalesce(b.net_eaches_available,0) as net_eaches_available,
					coalesce(b.net_packs_available,0) as net_packs_available,
					coalesce(b.net_overall_available,0) as net_overall_available
				from article_store_dc_mapping a
				left join net_available b using(article, dc_code)
			) a
			group by 1
		),
		pre_final as materialized (
		select
		    a.store,
		    a.store_name,
		    COALESCE(SUM(a.allocated_qty), 0) AS allocated_total,
		    COUNT(DISTINCT a.article) AS style_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count
		FROM
		    allocation_base a
		GROUP BY
		    a.store,
		    a.store_name
		)
		SELECT
		    sf.channel_id_name,
		    sf.region_id_name,
		    sf.district_id_name,
		    ab.store AS store_code,
		    sf.store_name,
		    sf.store_category,
		    sf.geo_region,
		    sf.state,
		    sf.city,
		    ab.allocation_count,
		    ab.style_count,
		    ROUND(COALESCE(c.net_overall_available, 0)::numeric, 0)::bigint AS available_total,
		    ROUND(COALESCE(ab.allocated_total, 0)::numeric, 0)::bigint AS allocated_total,
		    COALESCE(cap.store_capacity, 0::double precision) AS capacity,
		    CASE WHEN COALESCE(cap.store_capacity, 0) > 0
		         THEN ((COALESCE(cap.total_inv, 0)::numeric + COALESCE(ob.ob, 0)::numeric) / NULLIF(cap.store_capacity::numeric, 0))::float8
		         ELSE 0::float8 END AS store_percentage_to_capacity,
		    (ROUND(COALESCE(cap.net_available_capacity, 0)::numeric, 0) - ROUND(COALESCE(ob.ob, 0)::numeric, 0))::bigint AS net_available_capacity
		FROM
		    pre_final ab
		INNER JOIN store_filters sf ON sf.store_code = ab.store
		LEFT JOIN store_level_final_inv c ON ab.store = c.store_code
		LEFT JOIN capacity cap ON cap.store_code = ab.store
		LEFT JOIN ob_data ob ON ob.store_code = ab.store
    $$, _query_pa, _query_sa, _query_cus);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_store', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;
    RETURN $1;
    end
$function$
;
