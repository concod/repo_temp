--liquibase formatted sql
--changeset liquibase:Store Capacity Calculation Update runOnChange:true stripComments:false splitStatements:false context:MTP-113920 labels:MTP-113920
--comment: MTP-110047 | Store Capacity Calculation Update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_update_mode(input, jsonb, jsonb, jsonb, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_update_mode(input refcursor, jsonb, jsonb, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
	_created_at_filter text:='';
    _finalized_date_filter text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
	
    --For Now Adding to custom filter, need to check for efficiency
    IF $5 IS NOT NULL AND trim($5) != '' THEN
        _created_at_filter := format('(created_at AT TIME ZONE ''America/Los_Angeles'')::date = %L::date', $5);
        _finalized_date_filter := format('AND (created_at AT TIME ZONE ''America/Los_Angeles'')::date = %L::date', $5);
        
        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;
    _query_combine := format($$
        WITH product_filters as (
            SELECT
                article,
                display_article,
                article_description,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                l7_code as pc5,
                CAST(avg(price) AS numeric(10,2))::integer as price
            FROM
            global.product_attributes_filter 
            %1$s
            GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        ),
        store_filters AS (
            SELECT store_code, sls_floor_capacity, true as is_store_filtered  FROM
            global.store_attributes_filter  
            %2$s
        ),
        plan_master AS (
            SELECT  *   FROM (
                SELECT
                    plan_code,
                    plan_code as allocation_code, 
                    plan_code as allocation_name,
                    created_at,
                    type as allocation_type_code,
                    status,
                    CASE
					      WHEN type in (0, 4, 5) THEN 'Manual'
					      ELSE 'Auto'
					  	END
					    AS allocation_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                    is_deleted = false 
            ) %3$s
        ),
        filter_allocations_all_status as (
            select * from (
                select
                    carfg.store,
                    carfg.store_name,
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
                    plm.status,
                    CASE
                        WHEN inventory_source='dc' THEN 'B'
                        WHEN inventory_source='po' THEN 'L'
                        WHEN inventory_source='ns' THEN 'S'
                        ELSE ''
                    END
                    AS po_type,
                    CASE
                        WHEN plm.allocation_type_code in (0, 4, 5) THEN 'Manual'
                        ELSE 'Auto'
                    END
                    AS allocation_type,
                    plm.allocation_name,
                    plm.allocation_type_code
                from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                inner join plan_master plm on plm.plan_code = carfg.allocation_code
            ) a 
            
        ),

        filter_allocations_ob as materialized (
            	select * from filter_allocations_all_status 
				WHERE status = 2)
            ,
         unfiltered_plans_store_allocated_total AS (
			select
				carfg.store,
				carfg.allocated_total,
				carfg.created_at,
				plm.status
			from inventory_smart.create_allocation_result_flat_gurobi AS carfg
			inner join inventory_smart.plan_master plm on plm.plan_code = carfg.allocation_code
			WHERE  
			carfg.created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'America/Los_Angeles'
			AND carfg.created_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles'
			AND plm.status in (2,3)
		),
		ob_data AS (
			SELECT store, SUM(allocated_total) AS ob
			FROM unfiltered_plans_store_allocated_total a
			WHERE status = 2 
			GROUP BY store
		),
		finalized_data AS (
			SELECT store, SUM(allocated_total) AS finalized
			FROM unfiltered_plans_store_allocated_total a
			WHERE status = 3 
			%4$s
			GROUP BY store
		),
        filter_allocations as (
            select 
                carfg.*,
                paf.display_article,
                paf.article_description,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.price,
                paf.pc5,
                COALESCE(saf.sls_floor_capacity, 0) as sls_floor_capacity,
                COALESCE(saf.is_store_filtered, false) as is_store_filtered,
                sci.total_inv,
                um.user_name as created_by_name,
                ps.store_cluster,
                ob_data.ob,
                finalized_data.finalized
            from filter_allocations_ob carfg
            INNER JOIN product_filters paf ON paf.article = carfg.article
            LEFT JOIN store_filters saf ON carfg.store = saf.store_code
            LEFT JOIN inventory_smart.store_current_inventory sci ON carfg.store = sci.store_code
            LEFT JOIN global.user_master um ON um.user_code = carfg.created_by
            LEFT JOIN (
    			SELECT DISTINCT l0_name, l1_name, store_code, store_cluster
    			FROM global.product_store_attributes_filter
			) ps
  			ON paf.l0_name = ps.l0_name AND paf.l1_name = ps.l1_name AND carfg.store = ps.store_code
            LEFT JOIN ob_data on carfg.store=ob_data.store
            LEFT JOIN finalized_data on carfg.store=finalized_data.store
            --where EXISTS(SELECT 1 FROM store_filters saf WHERE saf.store_code = carfg.store) 
        ),
        pack_data_filtered_allocations as (
            select
                js.key as dc_code,
                dc.name as dc_name,
                carfg.store,
                carfg.store_name,
                carfg.store_grade,
                carfg.allocated_total,
                carfg.min,
                carfg.wos,
                carfg.display_article,
                carfg.article_description,
                carfg.l0_name,
                carfg.l1_name,
                carfg.l2_name,
                carfg.l3_name,
                carfg.l4_name,
                carfg.price,
                carfg.pc5,
                carfg.allocation_code,
                carfg.allocation_type_code,
                carfg.inv_avai,
                carfg.article,
                carfg.delivery_dt,
                carfg.order_priority,
                carfg.created_at,
                carfg.created_by,
                carfg.size,
                carfg.po_type,
                pack_data.pack_type_id,
                pack_data.packs_allocated_qty,
                pack_data.packs_available_qty,
                carfg.sls_floor_capacity,
                carfg.is_store_filtered,
                carfg.total_inv,
                carfg.created_by_name,
                carfg.store_cluster,
                carfg.ob,
                carfg.finalized
            FROM
                filter_allocations carfg
                CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
                CROSS JOIN LATERAL (
                    SELECT
                        UNNEST((TRANSLATE((js.value->>'packs_allocated'), '[]', '{}'))::text[]) AS pack_type_id,
                        UNNEST((TRANSLATE((js.value->>'packs_allocated_qty'), '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                        UNNEST((TRANSLATE((js.value->>'packs_available_qty'), '[]', '{}'))::numeric[]) AS packs_available_qty
                ) pack_data
                LEFT JOIN global.distribution_centres dc on js.key::text=dc.dc_code::text
        ),
        vir_reservation as (
            select
                article,
                dc_code,
                max(aic.vir_reservation_total) as vir_reservation_total,
                max(aic.vir_reservation_remaining) as vir_reservation_remaining,
                sum(max(aic.vir_reservation_remaining)) over (partition by article) as vir_reservation_total_across_dcs
            from
                inventory_smart.article_inventory_constraint aic
            where exists (select 1 from pack_data_filtered_allocations b where aic.article=b.article and aic.dc_code::text = b.dc_code::text)
            group by article, dc_code
        ),
        original_carfg_flat as (
            select 
                store,
                store_name,
                store_grade,
                article,
                display_article,
                article_description,
                store_cluster,
                l1_name,
                l3_name,
                pc5,
                pack_type,
                pack_type_id,
                sizes,
                units_in_pack_list,
                packs_allocated_qty,
                packs_allocated_qty as packs_allocated_qty_original,
                packs_available_qty,
                reserve_qty,
                dc_name,
                dc_code,
                created_at,
                created_by_name as created_by,
                delivery_dt,
                allocation_code,
                allocation_type_code,
                price,
                is_store_filtered,
                packs_allocated_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                )::int as total_allocated_qty_original,
                packs_available_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                )::int as total_available_qty,
                packs_allocated_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) * COALESCE(price, 1)::numeric(18,2) as allocated_value_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store) as store_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store) as store_level_packs_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END)  OVER (PARTITION BY l1_name, l3_name) as product_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY l1_name, l3_name) as product_level_packs_original,
                SUM(CASE WHEN pack_type = 'eaches' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END)  OVER (PARTITION BY store, allocation_code, dc_name, display_article, l1_name, l3_name) as store_product_level_eaches_original,
                SUM(CASE WHEN pack_type = 'packs' THEN COALESCE(packs_allocated_qty,0) ELSE 0 END) OVER (PARTITION BY store, allocation_code, dc_name, display_article, l1_name, l3_name) as store_product_level_packs_original,
                ROUND(
			    CASE 
			    WHEN COALESCE(AVG(sls_floor_capacity), 0)::numeric = 0 THEN 0
		        ELSE 
		        (COALESCE(AVG(total_inv), 0)::numeric
		       + COALESCE(AVG(ob), 0)::numeric
		       + COALESCE(AVG(finalized), 0)::numeric) / NULLIF(AVG(sls_floor_capacity)::numeric, 0)
		        END::numeric, 3)*100 AS store_percentage_to_capacity,
                COALESCE(AVG(sls_floor_capacity), 0)::numeric - COALESCE(AVG(total_inv), 0)::numeric - COALESCE(AVG(ob), 0)::numeric - COALESCE(AVG(finalized), 0)::numeric AS net_available_capacity,
                COALESCE(AVG(vir_reservation_total), 0)::numeric as vir_reservation_total,
                COALESCE(AVG(sls_floor_capacity), 0)::numeric as store_capacity,
                COALESCE(AVG(total_inv), 0)::numeric as store_total_inv,
                COALESCE(AVG(ob), 0)::numeric as ob_allocated_total,
                COALESCE(AVG(finalized), 0)::numeric as finalized_allocated_total,
                COALESCE(AVG(a.wos), 0) as wos,
                COALESCE(AVG(a.min), 0) as min,
                COALESCE(AVG(vir_reservation_remaining), 0) as vir_reservation_remaining,
                COALESCE(AVG(vir_reservation_total_across_dcs), 0)::numeric as vir_reservation_total_across_dcs
            from (
                select 
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.display_article,
                    a.article_description,
                    a.store_cluster,
                    a.l1_name,
                    a.l3_name,
                    a.pc5,
                    dpc.pack_type,
                    a.pack_type_id,
                    array_agg(a.size ORDER BY a.size) AS sizes,
                    array_agg(COALESCE(dpc.units_in_pack, 1) ORDER BY a.size) AS units_in_pack_list,
                    avg(a.packs_allocated_qty)::int AS packs_allocated_qty,
                    avg(a.packs_available_qty)::int AS packs_available_qty,
                    avg(COALESCE(dprq.quantity, 0)) AS reserve_qty,
                    a.dc_name,
                    a.dc_code,
                    a.allocation_code,
                    a.allocation_type_code,
                    a.price,
                    COALESCE(AVG(a.wos), 0) as wos,
                    COALESCE(AVG(a.min), 0) as min,
                    COALESCE(AVG(a.total_inv), 0)::numeric as total_inv ,
                    COALESCE(AVG(a.sls_floor_capacity), 0)::numeric as sls_floor_capacity ,
                    COALESCE(AVG(a.ob), 0)::numeric as ob ,
                    COALESCE(AVG(a.finalized), 0)::numeric as finalized ,
                    COALESCE(AVG(vr.vir_reservation_total), 0)::numeric as vir_reservation_total,
                    COALESCE(AVG(vr.vir_reservation_remaining), 0) as vir_reservation_remaining,
                    COALESCE(AVG(vr.vir_reservation_total_across_dcs), 0)::numeric as vir_reservation_total_across_dcs,
                    a.created_at,
                    a.created_by_name,
                    a.delivery_dt,
                    is_store_filtered
                FROM
                    pack_data_filtered_allocations a
                    INNER JOIN inventory_smart.dc_pack_configuration dpc on a.pack_type_id=dpc.pack_type_id and a.article=dpc.article and a.size=dpc.size
                    LEFT JOIN inventory_smart.dc_pack_reserve_quantity dprq on a.article=dprq.article and a.pack_type_id=dprq.pack_type_id  and a.dc_code::text = dprq.dc_code::text
                    LEFT JOIN vir_reservation vr on a.article=vr.article and a.dc_code::text = vr.dc_code::text
                group by
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.display_article,
                    a.article_description,
                    a.store_cluster,
                    a.l1_name,
                    a.l3_name,
                    a.pc5,
                    dpc.pack_type,
                    a.pack_type_id,
                    a.dc_name,
                    a.dc_code,
                    a.created_at,
                    a.delivery_dt,
                    a.allocation_code,
                    a.allocation_type_code,
                    a.price,
                    a.created_by_name,
                    is_store_filtered
            ) a
            group by 
                store,
                store_name,
                store_grade,
                article,
                display_article,
                article_description,
                store_cluster,
                l1_name,
                l3_name,
                pc5,
                pack_type,
                pack_type_id,
                sizes,
                units_in_pack_list,
                packs_allocated_qty,
                packs_available_qty,
                reserve_qty,
                dc_name,
                dc_code,
                allocation_code,
                allocation_type_code,
                price,
                created_at,
                created_by_name,
                delivery_dt,
                is_store_filtered
        )
        select *,
               l1_name as consumer,
               l3_name as category,
               store_level_eaches_original as store_level_eaches,
               store_level_packs_original as store_level_packs,
               product_level_eaches_original as product_level_eaches,
               product_level_packs_original as product_level_packs,
               store_product_level_eaches_original as store_product_level_eaches,
               store_product_level_packs_original as store_product_level_packs,
               total_allocated_qty_original as total_allocated_qty,
               allocated_value_original as allocated_value,
               false as is_edited
        from (
            select * from original_carfg_flat
        ) base_query
    $$, _query_pa, _query_sa, _query_cus, _finalized_date_filter);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_update_mode', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
    end
$function$
;
