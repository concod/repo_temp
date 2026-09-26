--liquibase formatted sql
--changeset liquibase:optimisation_post_net_inv_changes runOnChange:true stripComments:false splitStatements:false context:MTP-128655 labels:MTP-128655
--comment: MTP-128655 fixed net available inventory to allocate
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
	_l0_name       text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
	_new_inventory_source_values text[];
    _new_custom_filters jsonb;
	carfg_filter_start_date     text;
	carfg_filter_end_date       text;

    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);

        IF ($4 ? 'po_type') AND (jsonb_array_length($4->'po_type') > 0) THEN
            SELECT array_agg(val) INTO _new_inventory_source_values
            FROM (
                SELECT
                    CASE v
                        WHEN 'L' THEN 'po'
                        WHEN 'B' THEN 'dc'
                        WHEN 'S' THEN 'ns'
                    END AS val
                FROM jsonb_array_elements_text(($4->'po_type')->0->'values') v
            ) mapped
            WHERE val IS NOT NULL;

            -- Remove 'po_type' from $4 (if present), then add/replace 'inventory_source' with mapped values, preserving all other keys
            _new_custom_filters :=
                $4 - 'po_type' ||
                jsonb_build_object(
                    'inventory_source', jsonb_build_array(
                        jsonb_build_object(
                            'type', 'list',
                            'operator', 'in',
                            'values', to_jsonb(_new_inventory_source_values)
                        )
                    )
                );
            $4 := _new_custom_filters;
        END IF;

    _query_cus := inventory_smart.form_main_table_filters('', $4);
	_l0_name := $2->'l0_name'->0->'values'->>0;
	carfg_filter_start_date := (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE 'America/New_York';
	carfg_filter_end_date := (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York';

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
	        				type IN (4, 5, 12)
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
					where exists (select 1 from product_filters b where carfg.article=b.article)
					and
					    carfg.created_at >= '%5$s'
			    		AND carfg.created_at < '%6$s'
				) a  %3$s
			)

			,filter_allocations as materialized (
            select a.*
            from filter_allocations_pre a
            where exists (select 1 from store_filters b where a.store=b.store_code)
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
		,
		old_allocation as (
			SELECT
				b.article,
				b.dc_code,
				a.inventory_source,
				b.size,
				COALESCE(SUM(a.quantity), 0) AS quantity
			from base_dc_article_2 b
			LEFT JOIN allocated_units a
        	ON a.dc_code = b.dc_code AND a.article = b.article and a.inventory_source = b.inventory_source AND a.size = b.size
    		GROUP BY b.article, b.dc_code, a.inventory_source, b.size
		),
		available_units AS (
    		SELECT
        		dc_code,
        		article,
				inventory_source,
				size,
        		SUM(oh)     AS quantity_oh
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
		),
		avail_inv as materialized(
			select
				b.article,
				b.dc_code,
				v.inventory_source,
				b.size,
				COALESCE(SUM(v.quantity_oh), 0) AS quantity_oh
			from base_dc_article_2 b
    		LEFT JOIN available_units v
        	ON v.dc_code = b.dc_code AND v.article = b.article AND v.inventory_source = b.inventory_source AND v.size = b.size
    		GROUP BY b.article, b.dc_code, v.inventory_source, b.size
		),
		article_net_inv as materialized(
			SELECT
				b.article,
				SUM(COALESCE(ru.reserve_quantity, 0)) AS reserve_quantity,
				SUM(GREATEST(COALESCE(avail.quantity_oh, 0) - COALESCE(oalloc.quantity, 0) - COALESCE(ru.reserve_quantity, 0), 0)) AS dc_net_available_inventory_oh
			FROM base_dc_article_2 b
			LEFT JOIN old_allocation oalloc ON oalloc.article = b.article AND oalloc.dc_code = b.dc_code AND oalloc.inventory_source = b.inventory_source AND oalloc.size = b.size
			LEFT JOIN avail_inv avail ON avail.article = b.article AND avail.dc_code = b.dc_code AND avail.inventory_source = b.inventory_source AND avail.size = b.size
			LEFT JOIN reserved_units ru ON ru.article = b.article AND ru.dc_code::text = b.dc_code::text AND ru.inventory_source = b.inventory_source AND ru.size = b.size
			GROUP BY b.article
		),
		product_details as (
				SELECT product_code, article FROM global.product_attributes_filter a %1$s
				and exists (select 1 from base_dc_article b where b.article=a.article)
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
				where l0_name = '%4$s'
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
				FROM inventory_smart.article_instock
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
				COALESCE(ani.dc_net_available_inventory_oh, 0) AS dc_net_available_inventory_oh,
				coalesce(ani.reserve_quantity,0) as reserve_quantity,
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
				coalesce(iss.dc_instock_count,0) as dc_instock_count
			FROM
				final_pre AS aa
			LEFT JOIN
				article_net_inv ani ON ani.article = aa.article
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
			TO_CHAR(GREATEST(SUM(dc_net_available_inventory_oh) , 0),'FM999,999,999') AS "DC net available inventory",
			TO_CHAR(COALESCE(SUM(reserve_quantity), 0),'FM999,999,999') AS "Reserve quantity",
			ROUND(CAST(CASE WHEN SUM(dc_oh) != 0 THEN SUM(dc_wos_oh * dc_oh) / SUM(dc_oh) ELSE 0 END AS NUMERIC), 2) AS "DC WOS",
			ROUND(CAST(CASE WHEN SUM(str_inv_allocation_qty) != 0 THEN SUM(str_inv_allocation_wos * str_inv_allocation_qty) / SUM(str_inv_allocation_qty) ELSE 0 END AS NUMERIC), 2) AS "Current WOS + Allocation",
			ROUND(CAST(CASE WHEN SUM(str_inv) != 0 THEN SUM(wos_oh_oo_it * str_inv) / SUM(str_inv) ELSE 0 END AS NUMERIC), 2) AS "Current WOS",
			ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "Store In-Stock",
			ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) || '%%' AS "DC In-Stock"
		FROM final z
		$$, _query_pa, _query_sa, _query_cus, _l0_name, carfg_filter_start_date,carfg_filter_end_date);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;

        RETURN $1;
    end
$function$
;