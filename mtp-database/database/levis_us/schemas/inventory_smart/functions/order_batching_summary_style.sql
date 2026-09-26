--liquibase formatted sql
--changeset liquibase:VIR calc to be optimized runOnChange:true stripComments:false splitStatements:false context:MTP-121681 labels:MTP-121681
--comment: MTP-121681 | VIR calculation to be optimized 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_style(input, jsonb, jsonb, jsonb, character varying);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_style(input, jsonb, jsonb, jsonb, jsonb, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_style(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
    _query_combine text;
    _allocation_type_filter text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_psa     text:='';
    _query_cus     text:='';
	_created_at_filter text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
	_query_psa := global.form_main_table_filters('product_store_attributes_filter', $4);
    _query_cus := inventory_smart.form_main_table_filters('', $5);
	
    --For Now Adding to custom filter, need to check for efficiency
    IF $6 IS NOT NULL AND trim($6) != '' THEN
        _created_at_filter := format('(created_at AT TIME ZONE ''America/Los_Angeles'')::date = %L::date', $6);
        
        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;
    _query_combine := format($$
       WITH
        product_filters AS (
            SELECT DISTINCT article, display_article, l0_name, l1_name, l3_name FROM
            global.product_attributes_filter 
            %1$s
        )
        ,store_filters AS materialized (
            SELECT DISTINCT store_code
            , coalesce(sls_floor_capacity,0) as store_capacity 
            FROM
            global.store_attributes_filter 
            %2$s                
        ),
        plan_master as (
					SELECT
		*
		FROM (
			SELECT 
                plan_code, 
                plan_code as allocation_code, 
                plan_code as allocation_name, 
                created_at, 
                CASE WHEN type in (0, 4, 5) THEN 'Manual' ELSE 'Auto' end as allocation_type
              FROM 
                inventory_smart.plan_master 
              WHERE 
                status IN (2) 
                AND is_deleted = false 
			    AND created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'America/Los_Angeles'
				AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles'
            ) %3$s
	) ,
            filter_allocations_pre as materialized (
              select 
                * 
              from 
                (
                  select 
                    carfg.allocation_code,
                    carfg.article,
                    carfg.retail_size_cd,
                    carfg.store,
                    carfg.store_name,
                    carfg.allocated_total,
                    carfg.inv_avai,
                    carfg.created_at,
                    carfg.style,
                    CASE WHEN inventory_source = 'dc' THEN 'B' WHEN inventory_source = 'po' THEN 'L' WHEN inventory_source = 'ns' THEN 'S' ELSE '' END AS po_type,
                    allocation_type,
                    plm.allocation_name,
                    carfg.pack_dc_allocation,
                    paf.l0_name,
					paf.display_article,
                    paf.l1_name as consumer,
                    paf.l3_name as category,
					carfg.store_grade,
					carfg.store_cluster  from 
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg 
                    INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
                    INNER JOIN product_filters paf ON paf.article = carfg.article
                   where 
                        carfg.created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'America/Los_Angeles'
                        AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles'
                ) a 
                %4$s
            ) 
		,filter_allocations as (
				SELECT
					js.key as dc_code,
					store,
					store_name,
					allocated_total,
					style,
					allocation_code,
					inv_avai AS dc_available,
					article,
					retail_size_cd as size,
					pack_data.pack_type_id,
					pack_data.packs_allocated_qty,
					pack_data.packs_available_qty,
                    consumer,
					category,
					display_article,
					l0_name
				FROM
					filter_allocations_pre
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty
					) pack_data
		)
		,
		allocation_base_with_out_store_filters AS materialized(
			select a.* ,dpc.pack_type,dpc.units_in_pack,
			a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
			a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
			from filter_allocations a
			JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
		),
		allocation_base AS materialized(
			select *
			from allocation_base_with_out_store_filters a
			where exists (select 1 from store_filters sf where a.store = sf.store_code)
		),
		vir_reservation_remaining AS materialized(
			SELECT 
				SUM(max_vir_res.vir_reservation_remaining) AS vir_reservation_remaining,
				max_vir_res.consumer,
				max_vir_res.category
			FROM (
				SELECT 
					aic.article,
					aic.dc_code,
					MAX(aic.vir_reservation_remaining) AS vir_reservation_remaining,
					fa.consumer,
					fa.category,
					fa.display_article,
					fa.l0_name
				FROM inventory_smart.article_inventory_constraint aic
				JOIN (
					SELECT DISTINCT article, dc_code,consumer, category, display_article, l0_name
					FROM filter_allocations
				) fa ON fa.l0_name = aic.l0_name and fa.display_article = aic.display_article and fa.article = aic.article and fa.dc_code::text =aic.dc_code::text
				GROUP BY aic.article, aic.dc_code, fa.consumer, fa.category, fa.display_article, fa.l0_name
			) max_vir_res
			GROUP BY max_vir_res.consumer, max_vir_res.category
		)
--		select * from vir

		,pack_type_level_split as materialized(
		select 
			article,
			consumer,
			category,
			store,
			allocation_code,
			dc_code,
			pack_type_id,
			pack_type,
			array_agg(a.size ORDER BY a.size) AS sizes,
            SUM(COALESCE(a.units_in_pack, 1)) AS total_units_in_pack,
			AVG(coalesce(packs_allocated_qty, 0)) as packs_allocated_qty,
			AVG(coalesce(packs_available_qty, 0)) as packs_available_qty
		from allocation_base_with_out_store_filters a
		group by 1, 2, 3, 4, 5, 6, 7, 8
		),
		allocation_split as (
			select 
				consumer,
				category,
				sum(case when pack_type = 'packs' then packs_allocated_qty else 0 end) as allocated_packs,
				sum(case when pack_type = 'eaches' then packs_allocated_qty else 0 end) as allocated_eaches
			from pack_type_level_split a
			where exists (select 1 from store_filters sf where a.store = sf.store_code)
			group by consumer, category
		),
		dc_pack_reserves AS (
		    SELECT
		        article,
		        dc_code,
		        pack_type_id,
		        SUM(COALESCE(quantity, 0)) AS reserve_quantity
		    FROM
		        inventory_smart.dc_pack_reserve_quantity
		    WHERE
		        article IN (
		            SELECT DISTINCT article 
		            FROM allocation_base
		        )
		    GROUP BY article, dc_code, pack_type_id
		),
		dc_available_inventory AS (
			SELECT
				ab.dc_code,
				ab.article,
				ab.pack_type_id,
				ab.pack_type,
				ab.consumer,
				ab.category,
				MAX(packs_available_qty) as packs_available_qty,
				SUM(COALESCE(ab.packs_allocated_qty, 0)) as total_packs_allocated_qty,
				MAX(COALESCE(dcpr.reserve_quantity, 0)) as reserve_quantity,
				MAX(total_units_in_pack) as total_units_in_pack,
				GREATEST(
					MAX(packs_available_qty) - SUM(COALESCE(ab.packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
					0
				) as net_available_packs,
				GREATEST(
					MAX(packs_available_qty) - SUM(COALESCE(ab.packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
					0
				) * MAX(total_units_in_pack) as net_available_total
			FROM pack_type_level_split ab
			LEFT JOIN dc_pack_reserves dcpr ON dcpr.article = ab.article and dcpr.dc_code::text=ab.dc_code::text and dcpr.pack_type_id=ab.pack_type_id
			GROUP BY ab.dc_code, ab.article, ab.pack_type_id, ab.pack_type, ab.consumer, ab.category
		),
		dc_available_summary AS (
			SELECT
				consumer,
				category,
				SUM(CASE WHEN pack_type = 'eaches' THEN net_available_packs ELSE 0 END) as product_level_eaches_available,
				SUM(CASE WHEN pack_type = 'packs' THEN net_available_packs ELSE 0 END) as product_level_packs_available,
				SUM(net_available_total) as dc_total_available
			FROM dc_available_inventory
			group by consumer, category
		)
		,pre_final as (
		select
		    consumer,
		    category,
            concat_ws('|', consumer, category) AS unique_key,
		    coalesce(SUM(a.allocated_qty), 0) AS allocated_total,
		    round(AVG(coalesce(allo_split.allocated_eaches,0)),0) AS product_level_eaches,
    		round(AVG(coalesce(allo_split.allocated_packs,0)),0)  AS product_level_packs,
		    COUNT(DISTINCT a.article) AS style_count,
		    count(distinct a.store) as store_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count,
		    ROUND(AVG(vir_reservation_remaining),0) as vir_reservation_total
		FROM
		    allocation_base a
		 left join vir_reservation_remaining b using(consumer, category)
		 left join allocation_split allo_split using(consumer, category)
		GROUP BY 
		    consumer,
		    category)

			select 
			ab.consumer,
		    ab.category,
			ab.consumer as l1_name,
			ab.category as l3_name,
		    unique_key,
		    product_level_eaches,
		    product_level_packs,
			allocated_total,
		    style_count,
		    store_count,
		    allocation_count,
		    vir_reservation_total,
		    ROUND(AVG(dc_total_available)) AS available_total,
		    ROUND(AVG(product_level_eaches_available)) AS product_level_eaches_available,
		    ROUND(AVG(product_level_packs_available)) AS product_level_packs_available
		    from pre_final ab
		    left join dc_available_summary das using(consumer, category)
		    GROUP BY 
		    consumer,
		    category,
			l1_name,
			l3_name,
		    unique_key,
		    product_level_eaches,
		    product_level_packs,
		    style_count,
		    store_count,
		    allocation_count,
		    vir_reservation_total,
			allocated_total

    $$, _query_pa, _query_sa, _query_cus, _query_psa);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_style', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'product store filters str',$4,'other filters str',$5)) ;		
    RETURN $1;
    end
$function$
;