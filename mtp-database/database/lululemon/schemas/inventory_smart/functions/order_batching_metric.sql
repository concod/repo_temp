--liquibase formatted sql
--changeset liquibase:order_batching_metric_lululemon_1 runOnChange:true stripComments:false splitStatements:false context:MTP-115251 labels:MTP-115251
--comment: Order batching metric function for lululemon 1
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
  *
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _timezone text;
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
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
			WITH
			product_filters AS (
				SELECT product_code, article FROM global.product_attributes_filter %1$s
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
						oh_oo_intransit
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
			),
			article_level_pre as materialized (
				select * from
				(select 
					article,
					retail_size_cd,
					created_at,
					po_type,
					allocated_total,
					inv_avai,
					dense_rank() over(partition by article, po_type order by created_at desc) as rank_alloc
				from
					(
						select 
							allocation_code,
							article,
							retail_size_cd,
							created_at,
							po_type,
							sum(allocated_total) as allocated_total,
							avg(inv_avai) as inv_avai
							from filter_allocations 
						group by 1,2,3,4,5
					) x
				) y
				where rank_alloc=1
			),
			article_level as materialized (
				select 
					article,
					inv_avai - allocated_total as dc_net_available_inventory 
				from 
					(
						select 
							article,
							SUM(inv_avai) as inv_avai, 
							SUM(allocated_total) as allocated_total 
						from 
							article_level_pre	
						group by 
							1
					) y
			),
			reserved_units AS materialized(
				SELECT 
					article, 
					COALESCE(sum(quantity), 0) AS reserve_quantity
				FROM 
					inventory_smart.dc_reserve_quantity a
				WHERE
					exists (SELECT 1 FROM article_level b where b.article=a.article)
				GROUP BY
					article
			),
			product_details as materialized(
				SELECT product_code, article FROM global.product_attributes_filter %1$s
				AND article in (select article from article_level)
			),
			fwos as materialized(
				SELECT 
					paf.article, 
					fsst.product_code,
					fsst.dc_wos_oh,
					fsst.dc_oh,
					fsst.str_inv,
					fsst.wos_oh_oo_it
				FROM
					inventory_smart.fwos_sku_store_table fsst 
				JOIN product_details paf USING(product_code)
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
					where article IN (SELECT article FROM article_level)
					and store_code IN (SELECT store_code FROM store_filters)
					group by article
				) x
			),
			final_pre as materialized (
				select 
					article,
					(SELECT COUNT(DISTINCT allocation_code) FROM filter_allocations_pre) as allocation_count,
					sum(allocated_total) as allocated_qty,
					avg(oh_oo_intransit) as oh_oo_intransit
				from (
					SELECT 
						a.article,
						a.allocation_code,
						SUM(a.allocated_total) AS allocated_total,
						sum(oh_oo_intransit) as oh_oo_intransit
					FROM 
						filter_allocations a 
					GROUP BY 1,2
				) x
				group by 1
			),
			final as materialized (
				SELECT 
					aa.article,
					aa.allocation_count,
					aa.allocated_qty as allocated_qty,
					al.dc_net_available_inventory - coalesce(ru.reserve_quantity,0) as dc_available,
					coalesce(ru.reserve_quantity,0) as reserve_quantity,
					aa.oh_oo_intransit as str_inv,
					wms.wos_oh_oo_it,
					wms.str_wos_factor,
					wmd.dc_oh,
					wmd.dc_wos_oh,
					ROUND(CAST(wms.str_inv AS NUMERIC)+ CAST(aa.allocated_qty AS INTEGER), 0) AS str_inv_allocation_qty,
					ROUND(CAST(wms.wos_oh_oo_it AS NUMERIC) + CAST((CASE WHEN wms.str_wos_factor != 0 THEN aa.allocated_qty / wms.str_wos_factor ELSE 0 END) AS INTEGER), 2) AS str_inv_allocation_wos,
					iss.in_stock_count,
					iss.dc_instock_total_count,
					iss.total_count,
					iss.dc_instock_count
				FROM
					final_pre AS aa
				left join article_level al on al.article = aa.article
				LEFT JOIN
					reserved_units AS ru ON aa.article = ru.article
				LEFT JOIN
					wos_metrics_store wms ON wms.article = aa.article
				LEFT JOIN
					wos_metrics_dc wmd ON wmd.article = aa.article
				LEFT JOIN
					inventory_stock_stats iss ON iss.article = aa.article
			)
			SELECT
				TO_CHAR(COALESCE(AVG(allocation_count),0)::int,'FM999,999,999') AS "# Allocations",
				TO_CHAR(COUNT(DISTINCT article),'FM999,999,999') AS "# Allocated Styles",
				TO_CHAR(COALESCE(SUM(allocated_qty), 0),'FM999,999,999') AS "# Allocated units",
				TO_CHAR(SUM(dc_available),'FM999,999,999') AS "DC Net Available Inventory",
				TO_CHAR(COALESCE(SUM(reserve_quantity), 0),'FM999,999,999') AS "Reserve Quantity",
				ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2) AS "DC WOS",
				ROUND(COALESCE(CAST(CASE WHEN SUM(str_inv_allocation_qty) != 0 THEN SUM(str_inv_allocation_wos * str_inv_allocation_qty) / SUM(str_inv_allocation_qty) ELSE 0 END AS NUMERIC),0), 2) AS "Current WOS + Allocation",
				ROUND(COALESCE(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC),0), 2) AS "Current WOS",
				ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "Store In-Stock",
				ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "DC In-Stock"
			FROM final z
		$$, _query_pa, _query_sa, _query_cus, _timezone);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine; 
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;		

        RETURN $1;
    end
$function$
;

