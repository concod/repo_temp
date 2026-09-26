--liquibase formatted sql
--changeset liquibase:OB setup runOnChange:true stripComments:false splitStatements:false context:MTP-126141 labels:MTP-126141
--comment: MTP-126141 | OB setup
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_store(input, jsonb, jsonb, jsonb, jsonb, character varying);


CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying)
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
    _created_at_filter     text:='';
    _finalized_date_filter text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
	_query_psa := global.form_main_table_filters('product_store_attributes_filter', $4);
    _query_cus := inventory_smart.form_main_table_filters('', $5);
    --For Now Adding to custom filter, need to check for efficiency
    IF $6 IS NOT NULL AND trim($6) != '' THEN
        _created_at_filter := format('(created_at AT TIME ZONE ''UTC'')::date = %L::date', $6);
        _finalized_date_filter := format('AND (created_at AT TIME ZONE ''UTC'')::date = %L::date', $6);
        
        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;
    _query_combine := format($$
       WITH
        product_filters AS (
            SELECT DISTINCT article, l2_name, l4_name FROM
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
        plan_master AS (
		SELECT
		*
		FROM (
			SELECT 
                plan_code, 
                plan_code as allocation_name, 
				plan_code as allocation_code, 
                created_at, 
				status,
                CASE WHEN type in (0, 4, 5) THEN 'Manual' ELSE 'Auto' end as allocation_type
              FROM 
                inventory_smart.plan_master 
              WHERE 
                status IN (2,3) 
                AND is_deleted = false 
			    AND created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'UTC'
				AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
            )  %3$s
            ) ,
            filter_allocations_pre_base as materialized (
			SELECT
			*
			FROM (
			  select 
                carfg.allocation_code,
                carfg.article,
                carfg.retail_size_cd,
                carfg.store,
                carfg.store_name,
                carfg.allocated_total ,
                carfg.inv_avai,
                carfg.created_at,
                carfg.style,
                carfg.store_grade,
                carfg.store_cluster,
                CASE WHEN inventory_source = 'dc' THEN 'B' WHEN inventory_source = 'po' THEN 'L' WHEN inventory_source = 'ns' THEN 'S' ELSE '' END AS po_type, 
                allocation_type, 
                plm.allocation_name,
                carfg.pack_dc_allocation,
                plm.status 
              from 
                inventory_smart.create_allocation_result_flat_gurobi AS carfg 
                INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
               where 
                    exists (select 1 from product_filters b where carfg.article=b.article)
                    --AND exists (select 1 from store_filters sf where carfg.store = sf.store_code)
                    AND carfg.created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'UTC'
                    AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
            ) %4$s 
		),
            filter_allocations_pre as materialized (
                select * from filter_allocations_pre_base %3$s
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
					pack_data.packs_available_qty
				FROM
					filter_allocations_pre
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty
					) pack_data
					where filter_allocations_pre.status in (2)
		)
		,
		allocation_base_with_out_store_filters AS materialized (
			select a.* ,dpc.pack_type,dpc.units_in_pack,
			a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
			a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
			from filter_allocations a
			JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
		),
		allocation_base AS materialized(
			select * from allocation_base_with_out_store_filters a where exists (select 1 from store_filters sf where a.store = sf.store_code)
		),
		capacity AS (
		    SELECT 
		        sci.store_code
				,sci.total_inv
		        ,COALESCE(saf.store_capacity,0) AS store_capacity
		        ,COALESCE(saf.store_capacity,0) - sci.total_inv AS net_available_capacity
				,CASE 
				WHEN COALESCE(saf.store_capacity, 0) = 0 THEN 0
				ELSE ROUND(
					(COALESCE(sci.total_inv, 0) / saf.store_capacity )::numeric * 100, 2
					)
        		END AS store_percentage_to_capacity
		    FROM 
		        inventory_smart.store_current_inventory sci 
		    LEFT JOIN store_filters saf USING(store_code)
		),
		pack_type_level_split as materialized(
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
		from allocation_base_with_out_store_filters a
		group by 1, 2, 3, 4, 5, 6
		),
		allocation_split as (
			select 
				store,
				sum(case when pack_type = 'packs' then packs_allocated_qty else 0 end) as allocated_packs,
				sum(case when pack_type = 'eaches' then packs_allocated_qty else 0 end) as allocated_eaches
			from pack_type_level_split p
			where exists (select 1 from store_filters sf where p.store = sf.store_code)
			group by store
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
			GROUP BY ab.dc_code, ab.article, ab.pack_type_id, ab.pack_type
			),
		dc_available_summary AS (
			select sum(dc_eaches_available) as dc_eaches_available, sum(dc_packs_available) as dc_packs_available, sum(dc_total_available) as dc_total_available from (
			SELECT
				dc_code,
				SUM(CASE WHEN pack_type = 'eaches' THEN net_available_packs ELSE 0 END) as dc_eaches_available,
				SUM(CASE WHEN pack_type = 'packs' THEN net_available_packs ELSE 0 END) as dc_packs_available,
				SUM(net_available_total) as dc_total_available
			FROM dc_available_inventory
			GROUP BY dc_code
			)
		),
		unfiltered_plans_store_allocated_total AS (
			select
				carfg.store,
				carfg.allocated_total,
				carfg.created_at,
				plm.status
			from inventory_smart.create_allocation_result_flat_gurobi AS carfg
			inner join inventory_smart.plan_master plm on plm.plan_code = carfg.allocation_code
			inner join store_filters sf on sf.store_code = carfg.store
			WHERE  
			carfg.created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'UTC'
			AND carfg.created_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
			AND plm.status in (2,3)
		),
		ob_data AS (
			SELECT store as store_code, SUM(allocated_total) AS ob
			FROM unfiltered_plans_store_allocated_total a
			WHERE status = 2 
			GROUP BY store_code
		),
		finalized_data AS (
			SELECT store as store_code, SUM(allocated_total) AS finalized
			FROM unfiltered_plans_store_allocated_total a
			WHERE status = 3 
			%5$s
			GROUP BY store_code
		),

		pre_final as (
		select
		    coalesce(SPLIT_PART(dc.linked_store_code, '_', 1), a.dc_code) AS dc_code,
			a.pack_type,
		    a.store,
		    a.store_name,
		    coalesce(SUM(a.allocated_qty), 0) AS allocated_total,
		    COUNT(DISTINCT a.article) AS style_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count
		FROM
		    allocation_base a
		left join "global".distribution_centres dc on dc.dc_code::text = a.dc_code::text
		GROUP BY 
		    dc.linked_store_code,
		    a.store, 
		    a.store_name,
			a.dc_code,
			a.pack_type
		),
		pre_final_with_alloc as
		(select
		    a.store,
		    a.store_name,
		    SUM(a.allocated_total) AS allocated_total,
		    ROUND(AVG(coalesce(allo_split.allocated_eaches,0)),0) AS store_level_eaches,
		    ROUND(AVG(coalesce(allo_split.allocated_packs,0)),0) AS store_level_packs,
		    ROUND(AVG (style_count),0) AS style_count,
		    ROUND(AVG(allocation_count)) AS allocation_count,
		    ROUND(AVG(store_capacity)::numeric,0) AS store_capacity,
		    ROUND((AVG(net_available_capacity)::numeric - COALESCE(AVG(ob_data.ob), 0)::numeric - COALESCE(AVG(finalized_data.finalized), 0)::numeric)::numeric, 0) AS net_available_capacity,
			ROUND(
			  CASE 
			    WHEN COALESCE(AVG(saf.sls_floor_capacity), 0)::numeric = 0 THEN 0
		    ELSE 
		      (COALESCE(AVG(c.total_inv), 0)::numeric
		       + COALESCE(AVG(ob_data.ob), 0)::numeric
		       + COALESCE(AVG(finalized_data.finalized), 0)::numeric) / NULLIF(AVG(saf.sls_floor_capacity)::numeric, 0)
		  END::numeric, 3)*100
			AS store_percentage_to_capacity
		FROM
		    pre_final a
		left join allocation_split allo_split using(store)
		LEFT JOIN capacity c ON a.store = c.store_code
	    LEFT JOIN global.store_attributes_filter saf ON a.store = saf.store_code
		LEFT JOIN ob_data ON a.store = ob_data.store_code
		LEFT JOIN finalized_data ON a.store = finalized_data.store_code
		GROUP BY 
		    a.store, 
		    a.store_name)

			select ab.*,
		    das.dc_total_available AS available_total,
		    das.dc_eaches_available AS store_level_eaches_available,
		    das.dc_packs_available AS store_level_packs_available
		    from pre_final_with_alloc ab
		   	CROSS JOIN dc_available_summary das

    $$, _query_pa, _query_sa, _query_cus, _query_psa, _finalized_date_filter);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_store', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'product store filters str',$4,'other filters str',$5)) ;		
    RETURN $1;
    end
$function$
;
