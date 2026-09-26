--liquibase formatted sql
--changeset liquibase:Update Order Batching Update Mode V2  runOnChange:true stripComments:false splitStatements:false context:MTP-113920 labels:MTP-113920
--comment: MTP-133907 | Update Order Batching Update Mode V2 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_update_mode_v2(input, jsonb, jsonb, jsonb, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_update_mode_v2(input refcursor, jsonb, jsonb, jsonb, character varying)
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
    _created_at_start timestamptz:=now()::date AT TIME ZONE 'America/Los_Angeles';
    _created_at_end timestamptz:=(now()::date + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    
	
    --For Now Adding to custom filter, need to check for efficiency
    IF $5 IS NOT NULL AND trim($5) != '' THEN
        _created_at_filter := format('(created_at AT TIME ZONE ''America/Los_Angeles'')::date = %L::date', $5);
        _finalized_date_filter := format('AND (created_at AT TIME ZONE ''America/Los_Angeles'')::date = %L::date', $5);
        _created_at_start := $5::date AT TIME ZONE 'America/Los_Angeles';
        _created_at_end := ($5::date + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles';

        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;
    _query_combine := format($$

       with store_filters AS (
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
                    is_deleted = false and status = 2
            ) %3$s
        ),
        filter_allocations_ob as (
                select
                    carfg.store,
                    carfg.store_name,
                    carfg.store_grade,
                    carfg.store_cluster,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.wos,
                    carfg.allocation_code,
                    carfg.inv_avai,
                    carfg.article,
                    display_article,
                    article_description,
                    l0_name,
                    l1_name,
                    l3_name,
                    l7_code as pc5,
                    coalesce(CAST((price) AS numeric(10,2)),1)::integer as price,
                    carfg.delivery_dt::timestamptz,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.pack_dc_allocation,
                    carfg.retail_size_cd as size,
                    plm.status,
                    CASE
                        WHEN plm.allocation_type_code in (0, 4, 5) THEN 'Manual'
                        ELSE 'Auto'
                    END
                    AS allocation_type,
                    plm.allocation_name,
                    plm.allocation_type_code
                from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                inner join plan_master plm on plm.plan_code = carfg.allocation_code
                --Prduct filters applied here
                JOIN LATERAL (
                SELECT *
                FROM global.product_attributes_filter paf
                %1$s  and carfg.article = paf.article and carfg.retail_size_cd = paf.size
                LIMIT 1
                ) b ON TRUE
                where carfg.created_at >= %5$L::timestamptz and carfg.created_at < %6$L::timestamptz 
                
        ),
         unfiltered_plans_store_allocated_total AS materialized(
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
        filter_allocations as materialized(
            select 
                carfg.*,
                COALESCE(saf.sls_floor_capacity, 0) as sls_floor_capacity,
                COALESCE(saf.is_store_filtered, false) as is_store_filtered,
                COALESCE(sci.total_inv,0) as total_inv,
                um.user_name as created_by_name,
                COALESCE(ob_data.ob,0) as ob,
                COALESCE(finalized_data.finalized, 0) as finalized
            from filter_allocations_ob carfg
            LEFT JOIN store_filters saf ON carfg.store = saf.store_code
            LEFT JOIN inventory_smart.store_current_inventory sci ON carfg.store = sci.store_code
            LEFT JOIN global.user_master um ON um.user_code = carfg.created_by
            LEFT JOIN ob_data on carfg.store=ob_data.store
            LEFT JOIN finalized_data on carfg.store=finalized_data.store
        )
        SELECT
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
            carfg.l1_name as consumer,
            carfg.l3_name,
            carfg.l3_name as category,
            carfg.price,
            carfg.pc5,
            carfg.allocation_code,
            carfg.allocation_type_code,
            carfg.article,
            carfg.delivery_dt,
            carfg.created_at,
            carfg.size,
            pack_data.pack_type_id,
            pack_data.packs_allocated_qty,
            pack_data.packs_available_qty,
            carfg.sls_floor_capacity as store_capacity,
            carfg.is_store_filtered,
            carfg.total_inv as store_total_inv,
            carfg.created_by_name as created_by,
            carfg.store_cluster,
            carfg.ob as ob_allocated_total,
            carfg.finalized as finalized_allocated_total,
            COALESCE(dpc.units_in_pack,1) as units_in_pack,
            dpc.pack_type,
            COALESCE(dprq.quantity,0) as reserve_qty,
            COALESCE(aic.vir_reservation_total,0) as vir_reservation_total,
            COALESCE(aic.vir_reservation_remaining,0) as vir_reservation_remaining
        FROM
            filter_allocations carfg
            CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
            CROSS JOIN LATERAL (
                SELECT
                    UNNEST((TRANSLATE((js.value->>'packs_allocated'), '[]', '{}'))::text[]) AS pack_type_id,
                    UNNEST((TRANSLATE((js.value->>'packs_allocated_qty'), '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                    UNNEST((TRANSLATE((js.value->>'packs_available_qty'), '[]', '{}'))::numeric[]) AS packs_available_qty
            ) pack_data
            INNER JOIN inventory_smart.dc_pack_configuration dpc on pack_data.pack_type_id=dpc.pack_type_id and carfg.article=dpc.article and carfg.size=dpc.size
            LEFT JOIN inventory_smart.dc_pack_reserve_quantity dprq on carfg.article=dprq.article and js.key::text = dprq.dc_code::text and pack_data.pack_type_id=dprq.pack_type_id
            LEFT JOIN global.distribution_centres dc on js.key::text=dc.dc_code::text
            LEFT JOIN inventory_smart.article_inventory_constraint aic  on carfg.l0_name = aic.l0_name and carfg.display_article = aic.display_article and carfg.article=aic.article and js.key::text = aic.dc_code::text

    $$, _query_pa, _query_sa, _query_cus, _finalized_date_filter, _created_at_start, _created_at_end);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_update_mode_v2', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
    end
$function$
;