--liquibase formatted sql
--changeset liquibase:order_batching_metric_allocated alloc count fix runOnChange:true stripComments:false splitStatements:false context:MTP-56248 labels:MTP-56248
--comment: alloc count fix
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
  *
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
	_l0_name       text:='';
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
	_l0_name := $2->'l0_name'->0->'values'->>0;
    _query_combine := format($$
			WITH
			product_filters AS materialized (
				SELECT product_code, article, price, ia_sku_type FROM global.product_attributes_filter %1$s
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
					            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
					            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
					        )
					    ) 
				    AND 
				    created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York'
				    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
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
						carfg.dc_codes,
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
					    carfg.created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York'
			    		AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
				) a  %3$s
			)
			
			,filter_allocations as materialized (
            select a.*
            from filter_allocations_pre a
            where exists (select 1 from store_filters b where a.store=b.store_code)
            )
  		,base_dc_article AS materialized (
    		SELECT dc_code, article
    		FROM filter_allocations
    		CROSS JOIN UNNEST(dc_codes) AS dc_code
    		group by 1, 2
			),
		reserved_units AS materialized(
			SELECT 
				article, 
				COALESCE(sum(quantity), 0) AS reserve_quantity
			FROM 
				inventory_smart.sku_dc_reserved_units a
			WHERE
				exists (SELECT 1 FROM base_dc_article b where b.article=a.article and b.dc_code::text=a.dc_code::text) 
			GROUP BY
				article
		),
		allocated_units AS materialized (
    		SELECT
        		dc_code,
        		article,
        		SUM(quantity) AS quantity
    		FROM (
        		SELECT dc_code::text, article, quantity
        		FROM inventory_smart.sku_dc_allocated_units
        		UNION ALL
        		SELECT dc_code::text, article, quantity
        		FROM inventory_smart.sku_po_allocated_units
    		) x
    		GROUP BY dc_code, article
		)
		,
		old_allocation as materialized(
			SELECT
				b.article, 
				COALESCE(SUM(a.quantity), 0) AS quantity
			from base_dc_article b
			LEFT JOIN allocated_units a
        	ON a.dc_code = b.dc_code AND a.article = b.article
    		GROUP BY b.article
		),
		available_units AS materialized (
    		SELECT
        		dc_code,
        		article,
        		SUM(oh)     AS quantity_oh,
        		SUM(oh_oo)  AS quantity_oh_oo
    		FROM (
        		SELECT dc_code::text, article, oh, oh_oo
        		FROM inventory_smart.sku_dc_available_units
        		UNION ALL
        		SELECT po_code::text AS dc_code, article, oh, oh
        		FROM inventory_smart.sku_po_available_units
    		) x
    		GROUP BY dc_code, article
		),
		avail_inv as materialized(
			select
				b.article, 
				COALESCE(SUM(v.quantity_oh), 0) AS quantity_oh,
				COALESCE(SUM(v.quantity_oh_oo), 0) AS quantity_oh_oo
			from base_dc_article b
    		LEFT JOIN available_units v
        	ON v.dc_code = b.dc_code AND v.article = b.article
    		GROUP BY b.article
		),
		product_details as materialized(
			SELECT product_code, article FROM global.product_attributes_filter %1$s
			and article in (select distinct article from base_dc_article)
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
				--where l0_name = '%4$s'
		)
		,
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
				where article IN (SELECT article FROM base_dc_article)
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
            )   x
            group by 1
            )
		
		,final as materialized (
			SELECT 
				aa.article,
				aa.allocation_count,
				aa.allocated_qty as allocated_qty,
				GREATEST(avail.quantity_oh - oalloc.quantity - COALESCE(ru.reserve_quantity, 0), 0) AS dc_net_available_inventory_oh,
		    	GREATEST(avail.quantity_oh_oo - oalloc.quantity - COALESCE(ru.reserve_quantity, 0), 0) AS dc_net_available_inventory_oh_oo,
				coalesce(ru.reserve_quantity,0) as reserve_quantity,
				aa.oh_oo_intransit as str_inv,
				wms.wos_oh_oo_it,
				wms.str_wos_factor,
				wmd.dc_oh,
				wmd.dc_wos_oh,
				ROUND(CAST(wms.str_inv AS NUMERIC)+ CAST(aa.allocated_qty AS INTEGER), 0) AS str_inv_allocation_qty,
				ROUND(CAST(wms.wos_oh_oo_it AS NUMERIC) + CAST((CASE WHEN wms.str_wos_factor != 0 THEN aa.allocated_qty / wms.str_wos_factor ELSE 0 END) AS INTEGER), 2) AS str_inv_allocation_wos,
				coalesce(iss.in_stock_count,0) as in_stock_count,
				coalesce(iss.dc_instock_total_count,0) as dc_instock_total_count,
				coalesce(iss.total_count,0) as total_count,
				coalesce(iss.dc_instock_count,0) as dc_instock_count,
				paf.price * aa.allocated_qty as allocated_retail_value
			FROM
				final_pre AS aa
			left join old_allocation oalloc on oalloc.article = aa.article
			left join avail_inv avail on avail.article = aa.article
			LEFT JOIN
				reserved_units AS ru ON aa.article = ru.article
			LEFT JOIN
				wos_metrics_store wms ON wms.article = aa.article
			LEFT JOIN
				wos_metrics_dc wmd ON wmd.article = aa.article
			LEFT JOIN
				inventory_stock_stats iss ON iss.article = aa.article
			LEFT join (select article, sum(price)as price from product_filters where ia_sku_type in ('master','eaches') group by 1) paf ON aa.article = paf.article
		)
		
		SELECT
			COALESCE(AVG(allocation_count),0)::int AS "# Allocations",
			COUNT(DISTINCT article) AS "# Allocated Master SKUs",
			COALESCE(SUM(allocated_qty), 0) AS "# Allocated units",
			COALESCE(ROUND(CAST(COALESCE(SUM(allocated_retail_value), 0) AS NUMERIC), 2), 0) AS "Allocated Retail $",
			GREATEST(SUM(dc_net_available_inventory_oh) , 0) AS "DC net available inventory OH",
			GREATEST(SUM(dc_net_available_inventory_oh_oo) , 0) AS "DC net available inventory OH + OO",
			COALESCE(SUM(reserve_quantity), 0) AS "Reserve quantity",
			COALESCE(ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2), 0) AS "DC WOS",
			COALESCE(ROUND(CAST(CASE WHEN SUM(str_inv_allocation_qty) != 0 THEN SUM(str_inv_allocation_wos * str_inv_allocation_qty) / SUM(str_inv_allocation_qty) ELSE 0 END AS NUMERIC), 2), 0) AS "Current WOS + Allocation",
			COALESCE(ROUND(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC), 2), 0) AS "Current WOS",
			COALESCE(ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) * 100,2), 0) || '%%' AS "Store In-Stock",
			COALESCE(ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2), 0) || '%%' AS "DC In-Stock"
		FROM final z
		$$, _query_pa, _query_sa, _query_cus, _l0_name);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine; 
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;		
 
        RETURN $1;
    end
$function$
;