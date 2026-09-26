--liquibase formatted sql
--changeset liquibase:order_batching_metric_figs_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-XXXXX labels:MTP-XXXXX
--comment: Order batching metric function for FIGS v2 with updated reserve quantity reference | MTP-127128 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_metric(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_metric
  * Created by: Suba Selvandran N
  * Created at: 23-May-2023
  * No of input parameter: 3
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = custom filters str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Krishna          [Date]          Updated reserve quantity reference to dc_reserve_quantity
  * Manohar          13-APR-2026     Updated reserve quantity reference to sku_dc_reserved_units
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _tz text := COALESCE(inventory_smart.get_tenant_timezone(), 'US/eastern');
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
			WITH
			product_filters AS (
				SELECT product_code, article, price::int FROM global.product_attributes_filter %1$s
			),
			product_filters_2 as (
				select article, ROUND(AVG(coalesce(price,0)),2) as price
				from product_filters
				group by 1
			),
			store_filters AS materialized(
				SELECT store_code FROM global.store_attributes_filter %2$s
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
						type IN (4, 5) 
					OR (
						type IN (0, 2) 
						AND updated_at >= CURRENT_DATE AT TIME ZONE %4$L
						AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
					)
				) 
				AND 
				created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
				AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
			),
			filter_allocations_pre as materialized (
				SELECT
					*
				FROM (
					SELECT 
						carfg.allocation_code,
						carfg.article,
						carfg.retail_size_cd,
						carfg.store,
						carfg.allocated_total,
						carfg.inventory_source,
						carfg.inv_avai,
						carfg.created_at,
						CASE
							WHEN inventory_source='dc' THEN 'B'
							WHEN inventory_source='po' THEN 'L'
							WHEN inventory_source='ns' THEN 'S'
							ELSE ''
						END AS po_type,
						plm.plan_type as allocation_type,
						plm.allocation_name,
						oh_oo_intransit,
						carfg.pack_dc_allocation 
					FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
					INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
					where exists (select 1 from product_filters paf where paf.article=carfg.article)
					and
						carfg.created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
						AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
				) a %3$s
			),
			filter_allocations as materialized (
				select a.* 
				from filter_allocations_pre a
				where exists (select 1 from store_filters b where a.store=b.store_code)
			)
			,store_inv_gurobi as (
			select article, allocation_code, sum(oh_oo_intransit) oh_oo_intransit
			from filter_allocations
			group by 1,2
		)
			,allocation_base as (
			SELECT
					js.key as dc_code,
					article,
					allocation_code,
					inventory_source,
					retail_size_cd as size,
					pack_data.pack_type_id,
					pack_data.allocated_qty,
					pack_data.available_qty,
					'eaches' as pack_type
				FROM
					filter_allocations
					,jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS available_qty
					) pack_data
					where pack_type_id = retail_size_cd
		)
--		select * from allocation_base;
		,base_dc_article AS materialized (
			SELECT dc_code, article
			FROM allocation_base
			GROUP BY 1, 2
		)
--		select * from base_dc_article;
		,base_article AS materialized (
			SELECT  article
			FROM allocation_base
			GROUP BY 1
		)
--		select * from base_article;
		,base_dpc as materialized (
			select article, pack_type, pack_type_id, 1  as units_in_pack 
			from allocation_base
			where exists (select 1 from base_article b where allocation_base.article=b.article)
			group by 1,2,3
		)
--		select * from base_dpc;
		,allocated_units_dc AS materialized (
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
					pack_type_id,
					packs_allocated,
					sum(quantity) AS overall_allocated,
					sum(eaches_allocated) AS eaches_allocated
				from
					(
					SELECT
						allocation_code,
						dc_code::text,
						c.article,
						c.pack_type_id,
						quantity,
						case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
						case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated
					FROM inventory_smart.sku_dc_allocated_units a
					join base_dpc c on a.article = c.article and a.size=c.pack_type_id--using (article, pack_type_id)
					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
					) x
				GROUP BY 1, 2, 3, 4, 5
			) a
			group by 1,2
		)
--		select sum(overall_allocated) from allocated_units_dc;
		-- TODO: Replace with actual query when inventory_smart.sku_po_allocated_units is created
		-- allocated_units_po AS materialized (
		-- 	select dc_code, article, sum(overall_allocated) AS overall_allocated, sum(eaches_allocated) AS eaches_allocated, sum(packs_allocated) AS packs_allocated
		-- 	from ( select dc_code, article, pack_type_id, packs_allocated, sum(overall_allocated) AS overall_allocated, sum(eaches_allocated) AS eaches_allocated
		-- 		from ( SELECT dc_code::text, article, pack_type_id,
		-- 			case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
		-- 			case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated,
		-- 			sum(quantity) as overall_allocated
		-- 			FROM inventory_smart.sku_po_allocated_units a
		-- 			left join base_dpc c on a.article = c.article and a.size=c.pack_type_id--using (article, pack_type_id)
		-- 			WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
		-- 			group by 1,2,3,4,5 ) x
		-- 		GROUP BY 1, 2, 3, 4 ) a
		-- 	group by 1,2
		-- ),
		,allocated_units_po AS (
			select null::text as dc_code, null::text as article, 0::numeric as overall_allocated, 0::numeric as eaches_allocated, 0::numeric as packs_allocated where false
		)	
		,allocated_units as materialized (
			select * from allocated_units_dc
			union all
			select * from allocated_units_po
		)
--		select * from allocated_units;
		,available_units_dc as materialized (
			select dc_code, article, 
				sum(eaches_available) as eaches_available,
				sum(packs_available) as packs_available,
				sum(overall_available) as overall_available
			from(
				select dc_code, article, pack_type_id, 
					sum(eaches_available) as eaches_available,
					avg(packs_available) as packs_available,
					sum(overall_available) as overall_available
				from (
					select 
						a.article, 
						a.dc_code::text, 
						dpc.pack_type_id,
						case when dpc.pack_type='eaches' then a.oh_packs else 0 end as eaches_available,
						case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
						a.oh as overall_available
					from inventory_smart.sku_dc_available_units a
					join base_dpc dpc on a.article = dpc.article and a.size=dpc.pack_type_id--using(article,pack_type_id)
					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		)
--		select sum(overall_available) from available_units_dc;
		-- TODO: Replace with actual query when inventory_smart.sku_po_available_units is created
		-- available_units_po as materialized (
		-- 	select dc_code, article, sum(eaches_available) as eaches_available, sum(packs_available) as packs_available, sum(overall_available) as overall_available
		-- 	from( select dc_code, article, pack_type_id, sum(eaches_available) as eaches_available, avg(packs_available) as packs_available, sum(overall_available) as overall_available
		-- 		from ( select a.article, a.dc_code::text, a.pack_type_id,
		-- 			case when dpc.pack_type='eaches' then a.oh_packs else 0 end as eaches_available,
		-- 			case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
		-- 			a.oh as overall_available
		-- 			from inventory_smart.sku_po_available_units a
		-- 			left join base_dpc dpc on a.article = dpc.article and a.size=dpc.pack_type_id--using(article,pack_type_id)
		-- 			where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
		-- 		) a group by 1,2,3
		-- 	) b group by 1,2
		-- ),
		,available_units_po AS (
			select null::text as dc_code, null::text as article, 0::numeric as eaches_available, 0::numeric as packs_available, 0::numeric as overall_available where false
		)
		,available_units as materialized (
			select * from available_units_dc
			union all
			select * from available_units_po
		)
--		select * from available_units;
		,reserve_units_dc as materialized (
			select dc_code::text, article,
				COALESCE(sum(quantity), 0) as eaches_reserved,
				0::numeric as packs_reserved,
				COALESCE(sum(quantity), 0) as overall_reserved
			from inventory_smart.sku_dc_reserved_units a 
			where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
			group by 1, 2
		)
--		select sum(overall_reserved) from reserve_units_dc;
		,net_available as materialized (
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
		)
--		select * from net_available;
		,overall_net_available as materialized (
			select sum(net_overall_available) as total_net_available
			from net_available
		)
--		select * from overall_net_available;
			,allocations_aggregated As (
            select article,
            allocation_code,
            sum(allocated_qty) as allocated_qty,
            sum(available_qty) as dc_available
            from allocation_base
            GROUP BY article, allocation_code
		)
--		select * from allocations_aggregated;
		,reserved_units AS materialized(
			SELECT 
				article, 
				COALESCE(sum(overall_reserved), 0) AS reserve_quantity
			FROM 
				reserve_units_dc
			WHERE
				article IN (SELECT article FROM allocations_aggregated)
			GROUP BY
				article
		)
--			select * from reserved_units;
			,fwos as materialized(
				SELECT 
					paf.article, 
					fsst.product_code,
					fsst.dc_wos_oh,
					fsst.dc_oh,
					fsst.str_inv,
					fsst.wos_oh_oo_it
				FROM
					inventory_smart.fwos_sku_store_table fsst 
				JOIN product_filters paf USING(product_code)
			)
--			select distinct str_inv from fwos;
			,wos_metrics_store AS materialized(
				SELECT 
					article,
					str_inv,
					wos_oh_oo_it,
					CASE WHEN wos_oh_oo_it!=0 THEN ROUND(CAST(str_inv / wos_oh_oo_it AS NUMERIC), 2) ELSE 0 END as str_wos_factor        
				FROM (
					SELECT article, 
					ROUND(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC), 2) AS wos_oh_oo_it,
					SUM(str_inv) AS str_inv
					FROM fwos
					GROUP BY
						article
				) x
			)
--			select * from wos_metrics_store;
			,wos_metrics_dc AS materialized(
				SELECT 
					article,
					SUM(dc_oh) AS dc_oh,
					ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2) AS dc_wos_oh
				FROM (
					SELECT DISTINCT 
						fsst.article, 
						fsst.product_code,
						fsst.dc_wos_oh,
						fsst.dc_oh
					FROM
						fwos fsst
				) y
				GROUP BY
					article
			),
			inventory_stock_stats as (
				select
					article,
					in_stock_count,
					dc_instock_total_count,
					total_count,
					dc_instock_count
				from (
					-- Store In-Stock: using tot_inv at article-store level
					-- DC In-Stock: using oh_dc at article level (same value for all stores per article)
					select 
						article,
						COUNT(CASE WHEN COALESCE(tot_inv, 0) > 0 THEN 1 END) as in_stock_count,
						COUNT(*) as total_count,
						-- oh_dc is at article level, so we check if it's > 0 for this article
						CASE WHEN MAX(COALESCE(oh_dc, 0)) > 0 THEN 1 ELSE 0 END as dc_instock_count,
						1 as dc_instock_total_count
					from inventory_smart.article_inventory_dashboard
					where article IN (SELECT article FROM base_article)
					and store_code IN (SELECT store_code FROM store_filters)
					group by article
				) x
			)
--		select * from inventory_stock_stats;
			,final as materialized (
			SELECT 
				aa.article,
				aa.allocation_code,
				aa.allocated_qty,
				aa.dc_available,
				ru.reserve_quantity,
				sib.oh_oo_intransit as str_inv,
				wms.wos_oh_oo_it,
				wms.str_wos_factor,
				wmd.dc_oh,
				wmd.dc_wos_oh,
				ROUND(CAST(wms.str_inv AS NUMERIC)+ CAST(aa.allocated_qty AS INTEGER), 0) AS str_inv_allocation_qty,
				ROUND(CAST(wms.wos_oh_oo_it AS NUMERIC) + CAST((CASE WHEN wms.str_wos_factor != 0 THEN aa.allocated_qty / wms.str_wos_factor ELSE 0 END) AS INTEGER), 2) AS str_inv_allocation_wos,
				iss.in_stock_count,
				iss.dc_instock_total_count,
				iss.total_count,
				iss.dc_instock_count,
				paf.price * aa.allocated_qty as allocated_retail_value
			FROM
				allocations_aggregated AS aa
			LEFT JOIN
				reserved_units AS ru ON aa.article = ru.article
			LEFT JOIN
				wos_metrics_store wms ON wms.article = aa.article
			LEFT JOIN
				wos_metrics_dc wmd ON wmd.article = aa.article
			LEFT JOIN
				inventory_stock_stats iss ON iss.article = aa.article
			left join store_inv_gurobi sib on aa.article=sib.article and aa.allocation_code=sib.allocation_code
			LEFT JOIN product_filters_2 paf ON aa.article = paf.article
		)
		SELECT
			COUNT(DISTINCT allocation_code) AS "# Allocations",
			COUNT(DISTINCT article) AS "# Allocated Style Colors",
			COALESCE(SUM(allocated_qty), 0) AS "# Allocated units",
			COALESCE((SELECT total_net_available FROM overall_net_available), 0) AS "DC net available inventory",
			COALESCE(SUM(reserve_quantity), 0) AS "Reserve quantity",
			ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2) AS "DC WOS",
			ROUND(CAST(CASE WHEN SUM(str_inv_allocation_qty) != 0 THEN SUM(str_inv_allocation_wos * str_inv_allocation_qty) / SUM(str_inv_allocation_qty) ELSE 0 END AS NUMERIC), 2) AS "Current WOS + Allocation",
			ROUND(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC), 2) AS "Current WOS",
			ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "Store In-Stock%%",
			ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "DC In-Stock%%"
		FROM final z
		$$, _query_pa, _query_sa, _query_cus, _tz);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine; 
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;		

        RETURN $1;
    end
$function$
;

