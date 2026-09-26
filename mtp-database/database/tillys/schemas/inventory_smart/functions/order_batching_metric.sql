--liquibase formatted sql
--changeset tillys:order_batching_metric_date_bounds_fix runOnChange:true stripComments:false splitStatements:false context:MTP-TILLYS-OB labels:MTP-TILLYS-OB
--comment: Order batching KPI metric for Tilly's — aligned OB unpack (jsonb_array_elements_text, size=pack_type_id), dpc article+size, size-grain DC allocated/available/reserve with cfg for reserves
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_metric(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * inventory_smart.order_batching_metric — Tilly's Order Batching KPIs
  * Params: $1 refcursor, $2 product filter jsonb, $3 store filter jsonb, $4 custom filter jsonb
  *
  * Updated_by        Updated_on      Purpose
  * ----------        -----------     --------
  * (initial)                         Port Primark metric; America/New_York TZ; Levi's-style plan/carfg date bounds; dc_reserve_quantity;
  *                                   FWOS column map for fwos_sku_store_table; BRD KPI aliases;
  *                                   Reserve KPI = sum(overall_reserved) from reserve_units_dc.
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
			plan_master AS materialized(
				SELECT
					plan_code,
					plan_code as allocation_name,
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
					            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
					            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
					        )
					    )
				    AND
				    created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/New_York'
				    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
			),
			allocations as materialized (
				SELECT
					article,
					allocation_code,
					inventory_source,
					inv_avai,
					pack_dc_allocation,
					retail_size_cd as size,
					po_type,
					oh_oo_intransit
				FROM (
					SELECT
						carfg.article,
						carfg.allocation_code,
						carfg.inventory_source,
						carfg.inv_avai,
						carfg.pack_dc_allocation,
						carfg.retail_size_cd,
						CASE
							WHEN inventory_source='dc' THEN 'B'
							WHEN inventory_source='po' THEN 'L'
							WHEN inventory_source='ns' THEN 'S'
							ELSE ''
						END AS po_type,
						CASE
							WHEN plan_type in (0, 4, 5) THEN 'Manual'
							ELSE 'Auto'
						END AS allocation_type,
						plm.allocation_name,
						oh_oo_intransit
					FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
					INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
					where
					 article IN (SELECT article FROM product_filters)
                     AND store IN (SELECT store_code FROM store_filters)
					 AND carfg.created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/New_York'
					 AND carfg.created_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
				) a %3$s
			),
		store_inv_gurobi as (
			select article, allocation_code, sum(oh_oo_intransit) oh_oo_intransit
			from allocations
			group by 1,2
		),
		allocation_base as (
			select * from (
				SELECT
					js.key as dc_code,
					article,
					allocation_code,
					inventory_source,
					a.size,
					jsonb_array_elements_text(js.value->'packs_allocated')::text AS pack_type_id,
					jsonb_array_elements_text(js.value->'packs_allocated_qty')::numeric AS allocated_qty,
					jsonb_array_elements_text(js.value->'packs_available_qty')::numeric AS available_qty
				FROM
					allocations a,
					jsonb_each(a.pack_dc_allocation) js
			) unpacked
			where size = pack_type_id
		),
		allocation_base_with_dpc AS materialized (
			select a.* ,
			dpc.pack_type,
			dpc.units_in_pack,
			a.allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty_units,
			a.available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty_units
			from allocation_base a
			JOIN inventory_smart.dc_pack_configuration dpc USING (article, size)
		),
		base_dc_article AS materialized (
			SELECT dc_code, article
			FROM allocation_base_with_dpc
			GROUP BY 1, 2
		),
		base_article AS materialized (
			SELECT  article
			FROM allocation_base_with_dpc
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
		overall_net_available as materialized (
			select sum(net_overall_available) as total_net_available
			from net_available
		),
		allocations_aggregated As (
            select article,
            allocation_code,
            sum(allocated_qty_units) as allocated_qty,
            sum(available_qty_units) as dc_available
            from allocation_base_with_dpc
            GROUP BY article, allocation_code
		),
		fwos as materialized(
			SELECT
					paf.article,
					fsst.product_code,
					COALESCE(fsst.dc_oh_wos,0) AS dc_wos_oh,
					COALESCE(fsst.oh_dc,0) AS dc_oh,
					COALESCE(fsst.tot_inv, COALESCE(fsst.oh,0) + COALESCE(fsst.oo,0) + COALESCE(fsst.it,0)) AS str_inv,
					COALESCE(fsst.total_forecast, 0) AS wos_oh_oo_it
				FROM
					inventory_smart.fwos_sku_store_table fsst
				LEFT JOIN product_filters paf USING(product_code)
				WHERE paf.article in (SELECT article FROM allocations_aggregated)
				AND fsst.store_code IN (SELECT store_code FROM store_filters)
		),
		wos_metrics_store AS materialized(
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
		),
		wos_metrics_dc AS materialized(
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
				FROM inventory_smart.article_instock
		),
		final as materialized (
			SELECT
				aa.article,
				aa.allocation_code,
				aa.allocated_qty,
				aa.dc_available,
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
			COUNT(DISTINCT article) AS "# Allocated SKUs",
			COALESCE(SUM(allocated_qty), 0) AS "Allocated Units",
			ROUND(CAST(COALESCE(SUM(allocated_retail_value), 0) AS NUMERIC), 2) AS "Allocated Retail $",
			COALESCE((SELECT total_net_available FROM overall_net_available), 0) AS "DC Net available inventory",
			COALESCE((SELECT SUM(overall_reserved) FROM reserve_units_dc), 0) AS "Reserve Quantity",
			ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2) AS "DC WOS",
			ROUND(CAST(CASE WHEN SUM(str_inv_allocation_qty) != 0 THEN SUM(str_inv_allocation_wos * str_inv_allocation_qty) / SUM(str_inv_allocation_qty) ELSE 0 END AS NUMERIC), 2) AS "Current WOS + Allocation",
			ROUND(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC), 2) AS "Current WOS",
			ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "Store In-Stock %%",
			ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "DC In-Stock %%"
		FROM final z
		$$, _query_pa, _query_sa, _query_cus);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;

        RETURN $1;
    end
$function$
;
