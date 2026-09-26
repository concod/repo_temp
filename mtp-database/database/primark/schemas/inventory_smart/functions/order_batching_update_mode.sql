--liquibase formatted sql
--changeset liquibase:order_batching_update_mode_remove_store_tier runOnChange:true stripComments:false splitStatements:false context:MTP-128996 labels:MTP-128996
--comment: Remove store_tier from data pipeline
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_update_mode(input, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_update_mode(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_update_mode
  * Created by: Krishna
  * Created at: 2025-12-23
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = other filters str
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
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
        WITH product_filters as materialized (
            SELECT
                article,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l5_name,
                style_id,
                style_desc,
                ROUND(AVG(coalesce(price::int,0)),2) as price
            FROM
            global.product_attributes_filter 
            %1$s
            group by 1,2,3,4,5,6,7,8
        ),
        product_filters_with_code as materialized (
            SELECT DISTINCT
                article,
                product_code
            FROM
            global.product_attributes_filter 
            %1$s
            and product_code IS NOT NULL
        ),
        store_filters AS materialized (
            SELECT 
                store_code, 
                store_attribute_1,
                store_name,
                true as is_store_filtered  
            FROM
            global.store_attributes_filter    
            %2$s
        ),
        plan_master AS materialized (
            SELECT  *   FROM (
                SELECT
                    plan_code,
                    plan_code as allocation_code, 
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type,
                    status,
                    CASE
					      WHEN type in (0, 4, 5) THEN 'Manual'
					      ELSE 'Auto'
					  	END
					    AS allocation_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                    status IN (2) 
	                AND is_deleted = false 
	                AND (
	        				type IN (4, 5) 
	        			OR (
					            type IN (0, 2) 
					            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/Chicago'
					            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Chicago'
					        )
					    ) 
				    AND 
				    created_at >= (CURRENT_DATE - INTERVAL '30 days') AT TIME ZONE 'America/Chicago'
				    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Chicago'
            ) x %3$s
        ),
        filter_allocations_pre as materialized (
            select * from (
                select
                    carfg.store,
                    carfg.store_grade,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.wos,
                    carfg.allocation_code,
                    carfg.inv_avai,
                    carfg.article,
                    carfg.delivery_dt::timestamptz,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.pack_dc_allocation,
                    carfg.retail_size_cd as size,
                    carfg.inventory_source,
                    CASE
                        WHEN carfg.inventory_source='dc' THEN 'B'
                        WHEN carfg.inventory_source='po' THEN 'L'
                        WHEN carfg.inventory_source='ns' THEN 'S'
                        ELSE ''
                    END AS po_type,
                    carfg.style,
                    plm.status,
                    plm.allocation_type,
                    plm.allocation_name,
                    carfg.oh_oo_intransit
                from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                inner join plan_master plm on plm.plan_code = carfg.allocation_code
                where
                    carfg.created_at >= (Date(now() AT TIME ZONE 'America/Chicago' - interval '30 day')::timestamp )
                    AND carfg.created_at <= (date(now() AT TIME ZONE 'America/Chicago' + interval '1 day')::timestamp)
            ) a 
        ),
        filter_allocations as materialized (
            select 
                carfg.*,
                saf.store_name,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l5_name,
                paf.style_id,
                paf.style_desc,
                paf.price,
                COALESCE(saf.is_store_filtered, false) as is_store_filtered,
                saf.store_attribute_1,
                um.user_name as created_by_name,
                '' as store_cluster
            from filter_allocations_pre carfg
            INNER JOIN product_filters paf ON paf.article = carfg.article
            LEFT JOIN store_filters saf ON carfg.store = saf.store_code
            LEFT JOIN global.user_master um ON um.user_code = carfg.created_by
        ),
        filtered_articles as materialized (
            SELECT DISTINCT article, allocation_code
            FROM filter_allocations
        ),
        pack_data_filtered_allocations as materialized (
            select
                js.key as dc_code,
                dc.name as dc_name,
                carfg.store,
                carfg.store_name,
                carfg.store_grade,
                carfg.allocated_total,
                carfg.min,
                carfg.wos,
                carfg.l0_name,
                carfg.l1_name,
                carfg.l2_name,
                carfg.l3_name,
                carfg.l5_name,
                carfg.allocation_code,
                carfg.allocation_name,
                carfg.allocation_type,
                carfg.inv_avai,
                carfg.article,
                carfg.style,
                carfg.style_id,
                carfg.style_desc,
                carfg.delivery_dt,
                carfg.order_priority,
                carfg.created_at,
                carfg.created_by,
                carfg.size,
                carfg.po_type,
                carfg.price,
                pack_data.pack_type_id,
                pack_data.packs_allocated_qty,
                pack_data.packs_available_qty,
                pack_data.pack_rounding_factor,
                carfg.is_store_filtered,
                carfg.store_attribute_1,
                carfg.created_by_name,
                carfg.store_cluster,
                carfg.oh_oo_intransit
            FROM
                filter_allocations carfg
                CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
                CROSS JOIN LATERAL (
                    SELECT
                        UNNEST((TRANSLATE((js.value->>'packs_allocated'), '[]', '{}'))::text[]) AS pack_type_id,
                        UNNEST((TRANSLATE((js.value->>'packs_allocated_qty'), '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                        UNNEST((TRANSLATE((js.value->>'packs_available_qty'), '[]', '{}'))::numeric[]) AS packs_available_qty,
                        UNNEST((TRANSLATE((js.value->>'pack_rounding_factor'), '[]', '{}'))::numeric[]) AS pack_rounding_factor
                ) pack_data
                LEFT JOIN global.distribution_centres dc on js.key::text=dc.dc_code::text
        ),
        fwos_data as materialized (
            select
                paf.article,
                fsst.product_code,
                fsst.dc_wos_oh,
                fsst.dc_oh,
                fsst.str_inv,
                fsst.wos_oh_oo_it
            from
                inventory_smart.fwos_sku_store_table fsst
            inner join product_filters_with_code paf on fsst.product_code = paf.product_code
            where exists (select 1 from filtered_articles fa where paf.article = fa.article)
        ),
        wos_metrics as materialized (
            select
                article,
                -- Store metrics
                sum(str_inv) as str_inv,
                round(cast(case when sum(str_inv) != 0 then sum(wos_oh_oo_it * str_inv) / sum(str_inv) else 0 end as numeric), 2) as wos_oh_oo_it,
                case when sum(str_inv) != 0 and sum(wos_oh_oo_it * str_inv) / sum(str_inv) != 0 
                     then round(cast(sum(str_inv) / (sum(wos_oh_oo_it * str_inv) / sum(str_inv)) as numeric), 2) 
                     else 0 end as str_wos_factor,
                -- DC metrics
                sum(dc_oh) as dc_oh,
                round(cast(case when sum(dc_oh) != 0 then sum(dc_wos_oh * dc_oh) / sum(dc_oh) else 0 end as numeric), 2) as dc_wos_oh
            from (
                select
                    article,
                    str_inv,
                    wos_oh_oo_it,
                    dc_wos_oh,
                    dc_oh
                from fwos_data
            ) x
            group by article
        ),
        reserved_units as materialized (
            select
                dprq.article,
                coalesce(sum(dprq.quantity), 0) as reserve_quantity
            from
                inventory_smart.dc_pack_reserve_quantity dprq
            inner join filtered_articles fa on dprq.article = fa.article
            group by dprq.article
        ),
        inventory_stock_stats as materialized (
            select
                iss.article,
                iss.in_stock_count,
                iss.dc_instock_total_count,
                iss.total_count,
                iss.dc_instock_count
            from inventory_smart.article_instock iss
            inner join filtered_articles fa on iss.article = fa.article
        ),
        store_capacity_data as materialized (
            SELECT
                suc.store_code,
                COALESCE(SUM(suc.unit_capacity), 0)::numeric AS store_capacity,
                COALESCE(SUM(suc.unit_capacity), 0)::numeric - COALESCE(sci.total_inv, 0)::numeric AS net_available_capacity,
                COALESCE(sci.total_inv, 0)::numeric AS store_total_inv
            FROM inventory_smart.store_unit_capacity suc
            LEFT JOIN inventory_smart.store_current_inventory sci USING (store_code)
            GROUP BY suc.store_code, sci.total_inv
        ),
        original_carfg_flat as (
            select 
                store,
                store_name,
                store_grade,
                article,
                style,
                style_id,
                style_desc,
                store_cluster,
                l0_name,
                l3_name,
                l2_name,
                l5_name,
                pack_type,
                pack_type_id,
                sizes,
                units_in_pack_list,
                packs_allocated_qty,
                packs_allocated_qty as packs_allocated_qty_original,
                packs_available_qty,
                pack_rounding_factor,
                reserve_qty,
                dc_name,
                dc_code,
                created_at,
                created_by_name as created_by,
                delivery_dt,
                allocation_code,
                allocation_name,
                allocation_type,
                price,
                order_priority,
                po_type,
                is_store_filtered,
                store_attribute_1,
                packs_allocated_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) as total_allocated_qty_original,
                packs_available_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) as total_available_qty,
                packs_allocated_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) * COALESCE(price, 1) as allocated_value_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store) as store_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store) as store_level_packs_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY article) as product_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY article) as product_level_packs_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store, allocation_code, dc_name, article) as store_product_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store, allocation_code, dc_name, article) as store_product_level_packs_original,
                COALESCE(AVG(a.wos), 0) as wos,
                COALESCE(AVG(a.min), 0) as min,
                -- KPI calculation columns from inner query (already aggregated, use MAX to handle grouping)
                MAX(a.str_inv)::numeric as str_inv,
                MAX(a.wos_oh_oo_it)::numeric as wos_oh_oo_it,
                MAX(a.dc_oh)::numeric as dc_oh,
                MAX(a.dc_wos_oh)::numeric as dc_wos_oh,
                MAX(a.reserve_quantity)::numeric as reserve_quantity,
                MAX(a.oh_oo_intransit)::numeric as oh_oo_intransit,
                MAX(a.in_stock_count)::numeric as in_stock_count,
                MAX(a.total_count)::numeric as total_count,
                MAX(a.dc_instock_count)::numeric as dc_instock_count,
                MAX(a.dc_instock_total_count)::numeric as dc_instock_total_count,
                MAX(a.store_capacity)::numeric AS store_capacity,
                MAX(a.net_available_capacity)::numeric AS net_available_capacity,
                ROUND(
                    CASE WHEN MAX(a.store_capacity)::numeric = 0 THEN 0
                    ELSE MAX(a.store_total_inv)::numeric / NULLIF(MAX(a.store_capacity)::numeric, 0)
                    END::numeric, 3
                ) * 100 AS store_percentage_to_capacity
            from (
                select 
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.style,
                    a.style_id,
                    a.style_desc,
                    a.store_cluster,
                    a.l0_name,
                    a.l3_name,
                    a.l2_name,
                    a.l5_name,
                    dpc.pack_type,
                    a.pack_type_id,
                    array_agg(a.size ORDER BY a.size) AS sizes,
                    array_agg(COALESCE(dpc.units_in_pack, 1) ORDER BY a.size) AS units_in_pack_list,
                    avg(a.packs_allocated_qty) AS packs_allocated_qty,
                    avg(a.packs_available_qty) AS packs_available_qty,
                    avg(COALESCE(a.pack_rounding_factor, 1)) AS pack_rounding_factor,
                    avg(COALESCE(dprq.quantity, 0)) AS reserve_qty,
                    a.dc_name,
                    a.dc_code,
                    a.allocation_code,
                    MAX(a.allocation_name) as allocation_name,
                    MAX(a.allocation_type) as allocation_type,
                    AVG(a.price) as price,
                    COALESCE(AVG(a.wos), 0) as wos,
                    COALESCE(AVG(a.min), 0) as min,
                    a.created_at,
                    a.created_by_name,
                    a.delivery_dt,
                    a.order_priority,
                    a.po_type,
                    a.is_store_filtered,
                    a.store_attribute_1,
                    -- KPI columns from joined CTEs (using MAX since we're grouping)
                    COALESCE(MAX(wm.str_inv), 0) as str_inv,
                    COALESCE(MAX(wm.wos_oh_oo_it), 0) as wos_oh_oo_it,
                    COALESCE(MAX(wm.dc_oh), 0) as dc_oh,
                    COALESCE(MAX(wm.dc_wos_oh), 0) as dc_wos_oh,
                    COALESCE(MAX(ru.reserve_quantity), 0) as reserve_quantity,
                    COALESCE(MAX(a.oh_oo_intransit), 0) as oh_oo_intransit,
                    COALESCE(MAX(iss.in_stock_count), 0) as in_stock_count,
                    COALESCE(MAX(iss.total_count), 0) as total_count,
                    COALESCE(MAX(iss.dc_instock_count), 0) as dc_instock_count,
                    COALESCE(MAX(iss.dc_instock_total_count), 0) as dc_instock_total_count,
                    COALESCE(MAX(scd.store_capacity), 0)::numeric as store_capacity,
                    COALESCE(MAX(scd.net_available_capacity), 0)::numeric as net_available_capacity,
                    COALESCE(MAX(scd.store_total_inv), 0)::numeric as store_total_inv
                FROM
                    pack_data_filtered_allocations a
                    INNER JOIN inventory_smart.dc_pack_configuration dpc on a.pack_type_id=dpc.pack_type_id and a.article=dpc.article and a.size=dpc.size
                    LEFT JOIN inventory_smart.dc_pack_reserve_quantity dprq on a.article=dprq.article and a.pack_type_id=dprq.pack_type_id  and a.dc_code::text = dprq.dc_code::text
                    LEFT JOIN wos_metrics wm on a.article = wm.article
                    LEFT JOIN reserved_units ru on a.article = ru.article
                    LEFT JOIN inventory_stock_stats iss on a.article = iss.article
                    LEFT JOIN store_capacity_data scd ON a.store = scd.store_code
                group by
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.style,
                    a.style_id,
                    a.style_desc,
                    a.store_cluster,
                    a.l0_name,
                    a.l3_name,
                    a.l2_name,
                    a.l5_name,
                    dpc.pack_type,
                    a.pack_type_id,
                    a.dc_name,
                    a.dc_code,
                    a.created_at,
                    a.delivery_dt,
                    a.allocation_code,
                    a.order_priority,
                    a.po_type,
                    a.created_by_name,
                    a.is_store_filtered,
                    a.store_attribute_1
            ) a
            group by 
                store,
                store_name,
                store_grade,
                article,
                style,
                style_id,
                style_desc,
                store_cluster,
                l0_name,
                l3_name,
                l2_name,
                l5_name,
                pack_type,
                pack_type_id,
                sizes,
                units_in_pack_list,
                packs_allocated_qty,
                packs_available_qty,
                pack_rounding_factor,
                reserve_qty,
                dc_name,
                dc_code,
                allocation_code,
                allocation_name,
                allocation_type,
                price,
                created_at,
                created_by_name,
                delivery_dt,
                order_priority,
                po_type,
                is_store_filtered,
                store_attribute_1
        )
        select 
               store,
               store_name,
               store_grade,
               article,
               style,
               style_id,
               style_desc,
               store_cluster,
               l0_name AS division,
               l3_name AS department,
               l5_name AS subclass,
               pack_type,
               pack_type_id,
               sizes,
               units_in_pack_list,
               packs_allocated_qty,
               packs_allocated_qty_original,
               packs_available_qty,
               pack_rounding_factor,
               reserve_qty,
               dc_name,
               dc_code,
               created_at,
               created_by,
               delivery_dt,
               allocation_code,
               allocation_name,
               allocation_type,
               price,
               order_priority,
               po_type,
               is_store_filtered,
               store_attribute_1,
               total_allocated_qty_original,
               total_available_qty,
               allocated_value_original,
               wos,
               min,
               store_level_eaches_original,
               store_level_packs_original,
               product_level_eaches_original,
               product_level_packs_original,
               store_product_level_eaches_original,
               store_product_level_packs_original,
               store_level_eaches_original as store_level_eaches,
               store_level_packs_original as store_level_packs,
               product_level_eaches_original as product_level_eaches,
               product_level_packs_original as product_level_packs,
               store_product_level_eaches_original as store_product_level_eaches,
               store_product_level_packs_original as store_product_level_packs,
               total_allocated_qty_original as total_allocated_qty,
               allocated_value_original as allocated_value,
               reserve_qty as reserve_quantity,
               -- Required base columns for KPI calculations (cannot be calculated in Python)
               str_inv,
               wos_oh_oo_it,
               dc_oh,
               dc_wos_oh,
               oh_oo_intransit,
               in_stock_count,
               total_count,
               dc_instock_count,
               dc_instock_total_count,
               store_capacity,
               net_available_capacity,
               store_percentage_to_capacity,
               false as is_edited
        from (
            select 
                ocf.*
            from original_carfg_flat ocf
        ) base_query
    $$, _query_pa, _query_sa, _query_cus);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_update_mode', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
    end
$function$
;

