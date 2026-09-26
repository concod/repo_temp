--liquibase formatted sql
--changeset liquibase:store_name_column_update runOnChange:true stripComments:false splitStatements:false context:MTP-128996 labels:MTP-128996
--comment: adding store_name column to the function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(input, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch(refcursor, jsonb, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch(input refcursor, product_filter jsonb, store_filter jsonb, custom_filter jsonb, meta jsonb, unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_batch
  * Created by: Krishna
  * Created at: 26-Dec-2025
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = custom filter str
                            $4 = meta filter jsonb
                            $5 = unique_identifier
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Mithun R         8-JAN-2025     Initial version
  * Nibeel Yunus    10-FEB-2025     MTP-70495:Pagination on Order Batching Screen
  *
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
                    article,
                    l0_name,
                    l2_id,
                    l3_id,
                    l4_id,
                    l3_name,
                    l5_name
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
            );
            CREATE unlogged TABLE if not exists store_filters_' || unique_identifier || '  AS (
                SELECT store_code, store_attribute_1, store_name FROM
                global.store_attributes_filter  ' || _query_sa || '
            );
            CREATE unlogged TABLE if not exists store_capacity_' || unique_identifier ||' as (
                SELECT
                    suc.store_code,
                    COALESCE(SUM(suc.unit_capacity), 0) AS store_capacity,
                    COALESCE(SUM(suc.unit_capacity), 0) - sci.total_inv AS net_available_capacity,
                    sci.total_inv
                FROM inventory_smart.store_unit_capacity suc
                JOIN inventory_smart.store_current_inventory sci USING (store_code)
                GROUP BY suc.store_code, sci.total_inv
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
					            AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/Chicago''
					            AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/Chicago''
					        )
					    ) 
				    AND 
				    created_at >= (CURRENT_DATE - INTERVAL ''30 days'') AT TIME ZONE ''America/Chicago''
				    AND created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/Chicago''
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
						AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/Chicago''
						AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/Chicago''
                ) x 
            );
            CREATE unlogged TABLE if not exists final_plan_master_' || unique_identifier || ' AS (
                SELECT * FROM plan_master_' || unique_identifier || '
                UNION ALL
                SELECT * FROM plan_master_finalised_' || unique_identifier || '
            );
			CREATE unlogged TABLE if not exists unfiltered_plans_store_allocated_total_' || unique_identifier ||' as (
				select
					carfg.store,
					carfg.allocated_total,
					plm.status,
					carfg.created_at
				from inventory_smart.create_allocation_result_flat_gurobi AS carfg
				inner join final_plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
				inner join store_filters_' || unique_identifier || ' sf on sf.store_code = carfg.store
			);
			CREATE unlogged TABLE if not exists ob_data_' || unique_identifier ||' as (
				SELECT store, SUM(allocated_total) AS ob
				FROM unfiltered_plans_store_allocated_total_' || unique_identifier ||'
				GROUP BY store
			);
            CREATE unlogged TABLE if not exists filter_allocations_' || unique_identifier || ' AS (
            	select * from (
            		select
                        carfg.store,
                        saf.store_name,
                        carfg.store_grade,
                        saf.store_attribute_1,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.allocation_code,
                        carfg.inv_avai AS dc_available,
                        carfg.article,
                        paf.l0_name,
                        paf.l1_name,
                        paf.l2_name,
                        paf.l3_name,
<<<<<<< Updated upstream
=======
                        paf.l5_name,
>>>>>>> Stashed changes
                        carfg.delivery_dt,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        carfg.pack_dc_allocation,
                        retail_size_cd as size,
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
			                WHEN carfg.inventory_source=''dc'' THEN paf.l0_name||paf.l1_name||paf.l2_name||paf.l3_name||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/Chicago''), ''MMDDYYHHMISS'')
			                WHEN carfg.inventory_source=''po'' THEN paf.l0_name||paf.l1_name||paf.l2_name||''L''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/Chicago''), ''MMDDYYHHMISS'')
			                WHEN carfg.inventory_source=''ns'' THEN paf.l0_name||carfg.store||''S''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/Chicago''), ''MMDDYYHHMISS'')
			                ELSE paf.l0_name||paf.l1_name||paf.l2_name||paf.l3_name||''B''||TO_CHAR((carfg.created_at AT TIME ZONE ''America/Chicago''), ''MMDDYYHHMISS'')
			                END
			            AS release_po
	            	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
	                inner join plan_master_' || unique_identifier || ' plm on plm.plan_code = carfg.allocation_code
                    INNER JOIN store_filters_' || unique_identifier || ' saf ON saf.store_code = carfg.store
                	INNER JOIN product_filters_' || unique_identifier || ' paf ON paf.article = carfg.article
	                WHERE  
					carfg.created_at >= (Date(now() AT TIME ZONE ''America/Chicago'' - interval ''30 day'')::timestamp )
                    AND carfg.created_at <= (date(now() AT TIME ZONE ''America/Chicago'' + interval ''1 day'')::timestamp)
						and allocation_code is not null
	            ) a ' || _query_cus || '
            );
            -- materialized decrease performance here
            CREATE unlogged TABLE if not exists filtered_allocations_' || unique_identifier || ' AS (
            	select
                    js.key as dc_code,
                    carfg.store,
                    carfg.store_name,
                    carfg.store_grade,
                    carfg.store_attribute_1,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.allocation_code,
                    carfg.dc_available,
                    carfg.article,
                    carfg.l0_name,
                    carfg.l1_name,
                    carfg.l2_name,
                    carfg.l3_name,
<<<<<<< Updated upstream
=======
                    carfg.l5_name,
>>>>>>> Stashed changes
                    carfg.delivery_dt,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.release_po,
                    carfg.size,
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
            CREATE unlogged TABLE if not exists allocation_base_with_out_store_filters_' || unique_identifier || ' AS (
                select a.* ,
                dpc.pack_type,
                dpc.units_in_pack,
                a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
                a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
                from filtered_allocations_' || unique_identifier || ' a
                JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
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
                select article, pack_type, pack_type_id, sum(units_in_pack) as units_in_pack 
                from inventory_smart.dc_pack_configuration dpc
                where exists (select 1 from base_article_' || unique_identifier || ' b where dpc.article=b.article)
                group by 1,2,3
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
                        pack_type_id,
                        packs_allocated,
                        sum(quantity) AS overall_allocated,
                        sum(eaches_allocated) AS eaches_allocated
                    from
                        (
                        SELECT
                            allocation_code,
                            dc_code::text,
                            article,
                            pack_type_id,
                            quantity,
                            case when c.pack_type=''eaches'' then packs_allocated else 0 end AS eaches_allocated,
                            case when c.pack_type=''packs'' then packs_allocated else 0 end AS packs_allocated
                        FROM inventory_smart.sku_dc_allocated_units a
                        left join base_dpc_' || unique_identifier || ' c using (article, pack_type_id)
                        WHERE exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text )
                        ) x
                    GROUP BY 1, 2, 3, 4, 5
                ) a
                group by 1,2
            );
            CREATE unlogged TABLE if not exists allocated_units_po_' || unique_identifier || ' AS (
                select 
                    dc_code, 
                    article, 
                    sum(overall_allocated) AS overall_allocated,
                    sum(eaches_allocated) AS eaches_allocated,
                    sum(packs_allocated) AS packs_allocated
                from (
                    select
                        dc_code,
                        article,
                        pack_type_id,
                        packs_allocated,
                        sum(overall_allocated) AS overall_allocated,
                        sum(eaches_allocated) AS eaches_allocated
                    from
                        (
                        SELECT
                            dc_code::text,
                            article,
                            pack_type_id,
                            case when c.pack_type=''eaches'' then packs_allocated else 0 end AS eaches_allocated,
                            case when c.pack_type=''packs'' then packs_allocated else 0 end AS packs_allocated,
                            sum(quantity) as overall_allocated
                        FROM inventory_smart.sku_po_allocated_units a
                        left join base_dpc_' || unique_identifier || ' c using (article, pack_type_id)
                        WHERE exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text )
                        group by 1,2,3,4,5
                        ) x
                    GROUP BY 1, 2, 3,4
                ) a
                group by 1,2
            );
            CREATE unlogged TABLE if not exists allocated_units_' || unique_identifier || ' AS (
                select * from allocated_units_dc_' || unique_identifier || '
                union all
                select * from allocated_units_po_' || unique_identifier || '
            );
            CREATE unlogged TABLE if not exists available_units_dc_' || unique_identifier || ' AS (
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
                            a.pack_type_id,
                            case when dpc.pack_type=''eaches'' then a.oh_packs else 0 end as eaches_available,
                            case when dpc.pack_type=''packs'' then a.oh_packs else 0 end as packs_available,
                            a.oh as overall_available
                        from inventory_smart.sku_dc_available_units a
                        left join base_dpc_' || unique_identifier || ' dpc using(article,pack_type_id)
                        where exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text)
                    ) a
                    group by 1,2,3
                ) b
                group by 1,2
            );
            CREATE unlogged TABLE if not exists available_units_po_' || unique_identifier || ' AS (
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
                            a.po_code::text as dc_code, 
                            a.pack_type_id,
                            case when dpc.pack_type=''eaches'' then a.oh_eaches else 0 end as eaches_available,
                            case when dpc.pack_type=''packs'' then a.oh_packs else 0 end as packs_available,
                            a.oh as overall_available
                        from inventory_smart.sku_po_available_units a
                        left join base_dpc_' || unique_identifier || ' dpc using(article,pack_type_id)
                        where exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.po_code::text)
                    ) a
                    group by 1,2,3
                ) b
                group by 1,2
            );
            CREATE unlogged TABLE if not exists available_units_' || unique_identifier || ' AS (
                select * from available_units_dc_' || unique_identifier || '
                union all
                select * from available_units_po_' || unique_identifier || '
            );
            CREATE unlogged TABLE if not exists reserve_units_dc_' || unique_identifier || ' AS (
                select dc_code, article, 
                    sum(eaches_reserved) as eaches_reserved,
                    sum(packs_reserved) as packs_reserved,
                    sum(overall_reserved) as overall_reserved
                from(
                    select dc_code, article, pack_type_id, 
                        sum(eaches_reserved) as eaches_reserved,
                        avg(packs_reserved) as packs_reserved,
                        sum(overall_reserved) as overall_reserved
                    from (
                        select 
                            a.article, 
                            a.dc_code::text, 
                            a.pack_type_id,
                            case when dpc.pack_type=''eaches'' then a.quantity else 0 end as eaches_reserved,
                            case when dpc.pack_type=''packs'' then a.quantity else 0 end as packs_reserved,
                            a.quantity * coalesce(dpc.units_in_pack,1) as overall_reserved
                        from inventory_smart.dc_pack_reserve_quantity a
                        left join base_dpc_' || unique_identifier || ' dpc using(article,pack_type_id)
                        where reservation_till_date >= (now() at time zone ''America/Chicago'')::date
                        and exists (select 1 from base_dc_article_' || unique_identifier || ' b where b.article = a.article and b.dc_code::text = a.dc_code::text)
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
            --  capacity as (
            --     select 
            --         sci.store_code, 
            --         coalesce(saf.store_capacity,0) as store_capacity, 
            --         case when coalesce(saf.store_capacity,0)>0 then (sci.total_inv/saf.store_capacity) else 0 end as store_to_perc_cap 
            --     from inventory_smart.store_current_inventory sci 
            --     left join store_filters saf using(store_code)
            -- ),
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
                a.store,
                a.store_name,
                a.store_grade,
                a.store_attribute_1,
                a.article,
                a.l0_name AS division,
                a.l1_name AS department,
                a.l2_name AS class,
                a.l3_name AS subclass,
                coalesce(SPLIT_PART(dc.linked_store_code, ''_'', 1), a.dc_code) AS dc_code,
                SUM(a.min) as min,
                SUM(a.allocated_qty) as allocated_total,
                LEAST(COALESCE(SUM(a.min), 0), COALESCE(SUM(a.allocated_qty) , 0)) AS min_units_allocation,
                GREATEST(0, COALESCE(SUM(a.allocated_qty), 0) - LEAST(COALESCE(SUM(min), 0), COALESCE(SUM(a.allocated_qty), 0))) AS wos_units_allocation,
                COALESCE(MAX(na.net_overall_available), 0) AS dc_net_available_inventory,
                COALESCE(ROUND(AVG(asdas.allocated_eaches),0),0) as store_product_level_eaches,
                COALESCE(ROUND(AVG(asdas.allocated_packs),0),0) as store_product_level_packs,
                ROUND(AVG(COALESCE(dcs.net_available_total,0))::numeric,0) as available_total,
                ROUND(AVG(COALESCE(dcs.dc_article_level_eaches_available,0))::numeric,0) as store_product_level_eaches_available,
                ROUND(AVG(COALESCE(dcs.dc_article_level_packs_available,0))::numeric,0) as store_product_level_packs_available,
                a.delivery_dt,
                a.allocation_code,
                json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
                a.created_at,
                um.user_name created_by,
                a.release_po,
		        sc.store_capacity,
		        COALESCE(sc.net_available_capacity, 0) - COALESCE(ob.ob, 0) AS net_available_capacity,
			    CASE WHEN COALESCE(sc.store_capacity, 0) > 0
				    THEN (COALESCE(sc.total_inv, 0) + COALESCE(ob.ob, 0)) / sc.store_capacity
				    ELSE 0 END AS store_to_perc_cap
            from
                allocation_base_' || unique_identifier || ' a
            LEFT JOIN net_available_' || unique_identifier || ' na ON na.dc_code::text = a.dc_code::text AND na.article = a.article
            LEFT JOIN article_store_dc_allocation_split_' || unique_identifier || ' asdas ON asdas.article = a.article AND asdas.store = a.store AND asdas.dc_code::text = a.dc_code::text AND asdas.allocation_code = a.allocation_code
            LEFT JOIN dc_available_summary_' || unique_identifier || ' dcs ON dcs.dc_code::text = a.dc_code::text AND dcs.article = a.article
            LEFT JOIN global.user_master um ON um.user_code = a.created_by
            left join "global".distribution_centres dc on dc.dc_code::text = a.dc_code::text
            left join store_capacity_' || unique_identifier || ' sc on a.store=sc.store_code
            left join ob_data_' || unique_identifier || ' ob on a.store=ob.store
            group by 
                dc.linked_store_code,
                a.store, 
                a.store_name, 
                a.store_grade, 
                a.store_attribute_1,
                a.article,
                a.delivery_dt, 
                a.allocation_code,
                a.order_priority, 
                a.created_at,
                um.user_name,
                a.release_po,
                a.dc_code,
                a.l0_name,
                a.l1_name,
                a.l2_name,
                a.l3_name,
<<<<<<< Updated upstream
=======
                a.l5_name,
>>>>>>> Stashed changes
				sc.store_capacity,
				ob.ob,
				net_available_capacity,
				store_to_perc_cap
        ;';

        raise notice '_final_select_query: %', _query_combine;
        
        raise notice '--------------';

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
