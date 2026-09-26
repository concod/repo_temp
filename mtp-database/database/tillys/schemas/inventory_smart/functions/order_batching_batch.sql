--liquibase formatted sql
--changeset tillys:order_batching_batch_date_bounds_fix runOnChange:true stripComments:false splitStatements:false context:MTP-TILLYS-OB labels:MTP-TILLYS-OB
--comment: Tilly's Order Batching batch grid — Primark pagination/cache pattern; America/New_York TZ; plan/carfg bounds use Levi's-style (CURRENT_DATE ± interval) AT TIME ZONE (30-day window); pack JSON jsonb_array_elements_text + size=pack_type_id; paf join article + size to retail_size_cd (product_code grain); dpc join article+size; reserves via dc_pack_configuration; DC-only PO (commented); output columns match tc 126
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(input, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(refcursor, jsonb, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch(input refcursor, product_filter jsonb, store_filter jsonb, custom_filter jsonb, meta jsonb, unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 /*
  * inventory_smart.order_batching_batch — Tilly's OB batch grid (tc 126 column contract)
  * $1 cursor, $2 product_filter, $3 store_filter, $4 custom_filter, $5 meta (pagination), $6 unique_identifier
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
                    product_code,
                    article,
                    l0_name,
                    l1_name,
                    l2_name,
                    l3_name,
                    l4_name,
                    style_color_desc,
                    brand,
                    vendor,
                    comments,
                    silhouette,
                    color_id_name,
                    l0_id,
                    l2_id,
                    l3_id,
                    l4_id,
                    size
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
            );
            CREATE unlogged TABLE if not exists store_filters_' || unique_identifier || '  AS (
                SELECT
                    store_code,
                    channel_id_name,
                    region_id_name,
                    district_id_name,
                    store_name,
                    store_tier,
                    store_category,
                    geo_region
                FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
            CREATE unlogged TABLE if not exists store_capacity_' || unique_identifier ||' AS (
                SELECT
                    sf.store_code,
                    COALESCE(suc.store_capacity, 0)::float8 AS store_capacity,
                    COALESCE(suc.store_capacity, 0) - COALESCE(inv.total_inv, 0)::float8 AS net_available_capacity,
                    COALESCE(inv.total_inv, 0)::float8 AS total_inv
                FROM store_filters_' || unique_identifier || ' sf
                LEFT JOIN (
                    SELECT store_code, COALESCE(SUM(unit_capacity), 0)::float8 AS store_capacity
                    FROM inventory_smart.store_unit_capacity
                    GROUP BY store_code
                ) suc ON suc.store_code = sf.store_code
                LEFT JOIN (
                    SELECT store_code, SUM(COALESCE(oh, 0) + COALESCE(oo, 0) + COALESCE(it, 0))::float8 AS total_inv
                    FROM inventory_smart.latest_inventory
                    GROUP BY store_code
                ) inv ON inv.store_code = sf.store_code
            );
            CREATE unlogged TABLE if not exists plan_master_' || unique_identifier || ' AS (
                select * from (
                    SELECT
                        plan_code,
                        plan_code as allocation_name,
                        created_at,
                        type as plan_type,
						status,
                        CASE
					      WHEN type in (0, 4, 5) THEN ''Manual''
					      ELSE ''Auto''
					  	END
					    AS allocation_type
                    FROM
                        inventory_smart.plan_master
                    where status IN (2)
	                AND is_deleted = false
	                AND (
	        				type IN (4, 5)
	        			OR (
					            type IN (0, 2)
					            AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/New_York''
					            AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
					        )
					    )
				    AND
				    created_at >= (CURRENT_DATE - INTERVAL ''30 days'') AT TIME ZONE ''America/New_York''
				    AND created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
                ) x
            );
            CREATE unlogged TABLE if not exists plan_master_finalised_' || unique_identifier || ' AS (
                select * from (
                    SELECT
                        plan_code,
                        plan_code as allocation_name,
                        created_at,
                        type as plan_type,
						status,
                        CASE
					      WHEN type in (0, 4, 5) THEN ''Manual''
					      ELSE ''Auto''
					  	END
					    AS allocation_type
                    FROM
                        inventory_smart.plan_master
                    where status IN (3)
                        AND is_deleted = false
						AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/New_York''
						AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
                ) x
            );
            CREATE unlogged TABLE if not exists final_plan_master_' || unique_identifier || ' AS (
                SELECT * FROM plan_master_' || unique_identifier || '
                UNION ALL
                SELECT * FROM plan_master_finalised_' || unique_identifier || '
            );
			CREATE unlogged TABLE if not exists unfiltered_plans_store_allocated_total_' || unique_identifier ||' AS (
				select
					carfg.store,
					carfg.allocated_total,
					plm.status,
					carfg.created_at
				from inventory_smart.create_allocation_result_flat_gurobi AS carfg
				inner join final_plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
				inner join store_filters_' || unique_identifier || ' sf on sf.store_code = carfg.store
				WHERE
				carfg.created_at >= (CURRENT_DATE - INTERVAL ''30 days'') AT TIME ZONE ''America/New_York''
				AND carfg.created_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
			);
			CREATE unlogged TABLE if not exists ob_data_' || unique_identifier ||' AS (
				SELECT store, SUM(allocated_total) AS ob
				FROM unfiltered_plans_store_allocated_total_' || unique_identifier ||'
				GROUP BY store
			);
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' AS (
            	select * from (
            		select
                        carfg.store,
                        saf.channel_id_name,
                        saf.region_id_name,
                        saf.district_id_name,
                        saf.store_name,
                        saf.store_tier,
                        saf.store_category,
                        saf.geo_region,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.allocation_code,
                        carfg.inv_avai AS dc_available,
                        carfg.article,
                        paf.l0_name,
                        paf.l1_name,
                        paf.l2_name,
                        paf.l3_name,
                        paf.l4_name,
                        paf.style_color_desc,
                        paf.brand,
                        paf.vendor,
                        paf.comments,
                        paf.silhouette,
                        paf.color_id_name,
                        carfg.delivery_dt,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.pack_dc_allocation,
                        carfg.retail_size_cd as size,
	            		CASE
					      WHEN inventory_source=''dc'' THEN ''B''
					      WHEN inventory_source=''po'' THEN ''L''
					      WHEN inventory_source=''ns'' THEN ''S''
					      ELSE ''''
					  	END
					    AS po_type,
					    plm.allocation_type,
					    plm.allocation_name,
                        CASE
			                WHEN carfg.inventory_source=''dc'' THEN paf.l0_id||paf.l2_id||paf.l3_id||paf.l4_id||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York''), ''MMDDYYHHMISS'')
			                WHEN carfg.inventory_source=''po'' THEN paf.l0_id||paf.l2_id||paf.l3_id||''L''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York''), ''MMDDYYHHMISS'')
			                WHEN carfg.inventory_source=''ns'' THEN paf.l0_id||carfg.store||''S''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York''), ''MMDDYYHHMISS'')
			                ELSE paf.l0_id||paf.l2_id||paf.l3_id||paf.l4_id||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/New_York''), ''MMDDYYHHMISS'')
			                END
			            AS release_po
	            	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
	                inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
                    INNER JOIN store_filters_' || unique_identifier || ' saf ON saf.store_code = carfg.store
                	INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article AND paf.size IS NOT DISTINCT FROM carfg.retail_size_cd
				WHERE
					carfg.created_at >= (CURRENT_DATE - INTERVAL ''30 days'') AT TIME ZONE ''America/New_York''
                    AND carfg.created_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
						and allocation_code is not null
	            ) a ' || _query_cus || '
            );
            CREATE unlogged TABLE if not exists filtered_allocations_' || unique_identifier || ' AS (
            	select * from (
            	select
                    js.key as dc_code,
                    carfg.store,
                    carfg.channel_id_name,
                    carfg.region_id_name,
                    carfg.district_id_name,
                    carfg.store_name,
                    carfg.store_tier,
                    carfg.store_category,
                    carfg.geo_region,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.allocation_code,
                    carfg.dc_available,
                    carfg.article,
                    carfg.l0_name,
                    carfg.l1_name,
                    carfg.l2_name,
                    carfg.l3_name,
                    carfg.l4_name,
                    carfg.style_color_desc,
                    carfg.brand,
                    carfg.vendor,
                    carfg.comments,
                    carfg.silhouette,
                    carfg.color_id_name,
                    carfg.delivery_dt,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.release_po,
                    carfg.size,
                    jsonb_array_elements_text(js.value->''packs_allocated'')::text AS pack_type_id,
				    jsonb_array_elements_text(js.value->''packs_allocated_qty'')::numeric AS packs_allocated_qty,
				    jsonb_array_elements_text(js.value->''packs_available_qty'')::numeric AS packs_available_qty
				FROM
				    filter_allocations_' || unique_identifier || ' carfg
				    CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
				) unpacked where size = pack_type_id
            );
            CREATE unlogged TABLE if not exists allocation_base_with_out_store_filters_' || unique_identifier || ' AS (
                select a.* ,
                dpc.pack_type,
                dpc.units_in_pack,
                a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
                a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
                from filtered_allocations_' || unique_identifier || ' a
                JOIN inventory_smart.dc_pack_configuration dpc USING (article, size)
            );
            CREATE unlogged TABLE if not exists allocation_base_' || unique_identifier || ' AS (
                select * from allocation_base_with_out_store_filters_' || unique_identifier || ' a
                where EXISTS(SELECT 1 FROM store_filters_' || unique_identifier || ' saf WHERE saf.store_code = a.store)
            );
            CREATE unlogged TABLE if not exists base_dc_article_' || unique_identifier || ' AS (
                SELECT dc_code, article
                FROM allocation_base_' || unique_identifier || '
                GROUP BY 1, 2
            );
            CREATE unlogged TABLE if not exists base_article_' || unique_identifier || ' AS (
                SELECT  article
                FROM allocation_base_' || unique_identifier || '
                GROUP BY 1
            );
            CREATE unlogged TABLE if not exists base_dpc_' || unique_identifier || ' AS (
                select article, size, sum(units_in_pack) as units_in_pack
                from inventory_smart.dc_pack_configuration dpc
                where exists (select 1 from base_article_' || unique_identifier || ' b where dpc.article=b.article)
                group by 1,2
            );
            CREATE unlogged TABLE if not exists allocated_units_dc_' || unique_identifier || ' AS (
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
                        left join base_dpc_' || unique_identifier || ' c using (article, size)
                        WHERE exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text )
                        ) x
                    GROUP BY 1, 2, 3, 4, 5
                ) a
                group by 1,2
            );
--            CREATE unlogged TABLE if not exists allocated_units_po_' || unique_identifier || ' AS (
--                select
--                    dc_code,
--                    article,
--                    sum(overall_allocated) AS overall_allocated,
--                    sum(eaches_allocated) AS eaches_allocated,
--                    sum(packs_allocated) AS packs_allocated
--                from (
--                    select
--                        dc_code,
--                        article,
--                        pack_type_id,
--                        packs_allocated,
--                        sum(overall_allocated) AS overall_allocated,
--                        sum(eaches_allocated) AS eaches_allocated
--                    from
--                        (
--                        SELECT
--                            dc_code::text,
--                            article,
--                            pack_type_id,
--                            case when c.pack_type=''eaches'' then packs_allocated else 0 end AS eaches_allocated,
--                            case when c.pack_type=''packs'' then packs_allocated else 0 end AS packs_allocated,
--                            sum(quantity) as overall_allocated
--                        FROM inventory_smart.sku_po_allocated_units a
--                        left join base_dpc_' || unique_identifier || ' c using (article, pack_type_id)
--                        WHERE exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text )
--                        group by 1,2,3,4,5
--                        ) x
--                    GROUP BY 1, 2, 3,4
--                ) a
--                group by 1,2
--            );
            CREATE unlogged TABLE if not exists allocated_units_' || unique_identifier || ' AS (
                select * from allocated_units_dc_' || unique_identifier || '
--                union all
--                select * from allocated_units_po_' || unique_identifier || '
            );
            CREATE unlogged TABLE if not exists available_units_dc_' || unique_identifier || ' AS (
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
                        left join base_dpc_' || unique_identifier || ' dpc using(article, size)
                        where exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text)
                    ) a
                    group by 1,2,3
                ) b
                group by 1,2
            );
--            CREATE unlogged TABLE if not exists available_units_po_' || unique_identifier || ' AS (
--                select dc_code, article,
--                    sum(eaches_available) as eaches_available,
--                    sum(packs_available) as packs_available,
--                    sum(overall_available) as overall_available
--                from(
--                    select dc_code, article, pack_type_id,
--                        sum(eaches_available) as eaches_available,
--                        avg(packs_available) as packs_available,
--                        sum(overall_available) as overall_available
--                    from (
--                        select
--                            a.article,
--                            a.po_code::text as dc_code,
--                            a.pack_type_id,
--                            case when dpc.pack_type=''eaches'' then a.oh_eaches else 0 end as eaches_available,
--                            case when dpc.pack_type=''packs'' then a.oh_packs else 0 end as packs_available,
--                            a.oh as overall_available
--                        from inventory_smart.sku_po_available_units a
--                        left join base_dpc_' || unique_identifier || ' dpc using(article,pack_type_id)
--                        where exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.po_code::text)
--                    ) a
--                    group by 1,2,3
--                ) b
--                group by 1,2
--            );
            CREATE unlogged TABLE if not exists available_units_' || unique_identifier || ' AS (
                select * from available_units_dc_' || unique_identifier || '
--                union all
--                select * from available_units_po_' || unique_identifier || '
            );
            CREATE unlogged TABLE if not exists reserve_units_dc_' || unique_identifier || ' AS (
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
                        where (drq.reservation_till_date is null or drq.reservation_till_date >= (now() at time zone ''America/New_York'')::date)
                        and exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = paf.article and b.dc_code::text = pmpd.dc_code::text)
                    ) a
                    group by 1,2,3
                ) b
                group by 1,2
            );
            CREATE unlogged TABLE if not exists net_available_' || unique_identifier || ' AS (
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
                from available_units_' || unique_identifier || ' a
                left join allocated_units_' || unique_identifier || ' b using (article,dc_code)
                left join reserve_units_dc_' || unique_identifier || ' c using(article,dc_code)
            );
            CREATE unlogged TABLE if not exists pack_type_level_split_' || unique_identifier || ' AS (
                select
                    article,
                    store,
                    allocation_code,
                    dc_code,
                    pack_type_id,
                    pack_type,
                    array_agg(a.size ORDER BY a.size) AS sizes,
                    SUM(COALESCE(a.units_in_pack, 1)) AS total_units_in_pack,
                    AVG(coalesce(packs_allocated_qty, 0)) as packs_allocated_qty,
                    AVG(coalesce(packs_available_qty, 0)) as packs_available_qty
                from allocation_base_with_out_store_filters_' || unique_identifier || ' a
                group by 1, 2, 3, 4, 5, 6
            );
            CREATE unlogged TABLE if not exists article_store_dc_allocation_split_' || unique_identifier || ' AS (
                select
                    article,
                    store,
                    dc_code,
                    allocation_code,
                    sum(case when pack_type = ''packs'' then packs_allocated_qty else 0 end) as allocated_packs,
                    sum(case when pack_type = ''eaches'' then packs_allocated_qty else 0 end) as allocated_eaches
                from pack_type_level_split_' || unique_identifier || '
                where exists (select 1 from store_filters_' || unique_identifier || ' sf where pack_type_level_split_' || unique_identifier || '.store = sf.store_code)
                group by article, store, dc_code, allocation_code
            );
            CREATE unlogged TABLE if not exists dc_available_summary_' || unique_identifier || ' AS (
                SELECT
                    dc_code,
                    article,
                    net_eaches_available as dc_article_level_eaches_available,
                    net_packs_available as dc_article_level_packs_available,
                    net_overall_available as net_available_total
                FROM net_available_' || unique_identifier || '
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
                a.channel_id_name,
                a.region_id_name,
                a.district_id_name,
                a.store,
                a.store_name,
                a.store_tier,
                a.store_category,
                a.geo_region,
                a.l0_name,
                a.l1_name,
                a.l2_name,
                a.l3_name,
                a.l4_name,
                a.article,
                a.style_color_desc,
                a.brand,
                a.vendor,
                a.comments,
                a.silhouette,
                a.color_id_name,
                COALESCE(MAX(dc.name), MAX(a.dc_code::text)) AS dc_name,
                a.allocation_code,
                SUM(a.min) AS min,
                SUM(a.allocated_qty) AS allocated_total,
                a.delivery_dt,
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) AS order_priority,
                a.created_at,
                um.user_name AS created_by
            from
                allocation_base_' || unique_identifier || ' a
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            LEFT JOIN "global".distribution_centres dc ON dc.dc_code::text = a.dc_code::text
            group by
                a.channel_id_name,
                a.region_id_name,
                a.district_id_name,
                a.store,
                a.store_name,
                a.store_tier,
                a.store_category,
                a.geo_region,
                a.l0_name,
                a.l1_name,
                a.l2_name,
                a.l3_name,
                a.l4_name,
                a.article,
                a.style_color_desc,
                a.brand,
                a.vendor,
                a.comments,
                a.silhouette,
                a.color_id_name,
                a.allocation_code,
                a.order_priority,
                a.created_at,
                um.user_name,
                a.dc_code,
                a.release_po,
                a.delivery_dt
        ;';

        raise notice '_final_select_query: %', _query_combine;

	execute 'create unlogged TABLE if not exists cache.cache_result_' || unique_identifier || ' as ' || _query_combine || ';';
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
