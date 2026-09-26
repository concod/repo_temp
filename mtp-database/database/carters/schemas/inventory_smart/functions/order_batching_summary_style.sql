--liquibase formatted sql
--changeset liquibase:order_batching_summary_style_optimization runOnChange:true stripComments:false splitStatements:false context:MTP-128655 labels:MTP-128655
--comment: MTP-128655 fixed net available inventory to allocate
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_style(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_style(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.order_batching_summary_style
  * Created by: Mithun R
  * Created at: 2025-02-04
  * updated by: Gururaj Patil
  * updated at: 2026-02-23
  * No of input parameter: 4
  * Parameter Description :$1 = cursor
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
            SELECT DISTINCT article, l2_name,l3_name, l4_name,l5_name FROM
            global.product_attributes_filter %1$s
        )
        ,store_filters AS materialized (
            SELECT DISTINCT store_code, store_capacity FROM
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
			    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/New_York'
            ),
            filter_allocations_pre as materialized (
              select
                *
              from
                (
                  select
                  	carfg.allocation_code,
                    carfg.article,
                    carfg.style,
                    carfg.style_description,
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
                    plm.allocation_name
                  from
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
                    where exists (select 1 from product_filters paf where paf.article=carfg.article)
                    and
                    	carfg.created_at >= '%4$s'
			    		AND carfg.created_at < '%5$s'
            ) a %3$s
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
			)
			, allocated_units AS materialized (
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
		    , old_allocation as (
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
		    )
		    , available_units AS (
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
            article_net_inv AS materialized (
              SELECT
                b.article,
                SUM(COALESCE(ru.reserve_quantity, 0)) AS reserve_quantity,
                SUM(GREATEST(COALESCE(avail.quantity_oh, 0) - COALESCE(oalloc.quantity, 0) - COALESCE(ru.reserve_quantity, 0), 0)) AS available_to_allocate
              FROM base_dc_article_2 b
              LEFT JOIN old_allocation oalloc ON oalloc.article = b.article AND oalloc.dc_code = b.dc_code AND oalloc.inventory_source = b.inventory_source AND oalloc.size = b.size
              LEFT JOIN avail_inv avail ON avail.article = b.article AND avail.dc_code = b.dc_code AND avail.inventory_source = b.inventory_source AND avail.size = b.size
              LEFT JOIN reserved_units ru ON ru.article = b.article AND ru.dc_code::text = b.dc_code::text AND ru.inventory_source = b.inventory_source AND ru.size = b.size
              GROUP BY b.article
            ),
            final as materialized (
              SELECT
                a.article,
                a.style,
                a.style_description,
                COUNT(DISTINCT a.store) AS store_count,
                COUNT(DISTINCT a.allocation_code) AS allocation_count,
                SUM(a.allocated_total) AS total_allocated_qty
              FROM
                filter_allocations a
              GROUP BY
                a.article,
                a.style,
                a.style_description,
                a.po_type,
                a.allocation_type
            )
            SELECT
              a.article,
              a.style,
              a.style_description,
              b.l2_name,
              b.l3_name,
              b.l4_name,
              b.l5_name,
              a.store_count,
              a.allocation_count,
              a.total_allocated_qty as allocated_quantity,
              COALESCE(ani.reserve_quantity, 0) AS reserved_quantity,
              COALESCE(ani.available_to_allocate, 0) as available_to_allocate
            FROM
              final a
              left join product_filters b on a.article = b.article
              LEFT JOIN article_net_inv ani ON ani.article = a.article
    $$, _query_pa, _query_sa, _query_cus, carfg_filter_start_date, carfg_filter_end_date);

    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_style', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4));
    RETURN $1;
    end
$function$
;