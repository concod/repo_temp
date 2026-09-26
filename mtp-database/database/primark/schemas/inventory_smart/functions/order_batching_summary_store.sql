--liquibase formatted sql
--changeset liquibase:store_name_column_update runOnChange:true stripComments:false splitStatements:false context:MTP-128996 labels:MTP-128996
--comment: adding store_name column to the function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_store(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_summary_store
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
        WITH
		product_filters AS materialized (
			SELECT DISTINCT article FROM
			global.product_attributes_filter %1$s
		)
		,store_filters AS materialized (
			SELECT DISTINCT store_code, store_name FROM
			global.store_attributes_filter %2$s                
		),
		capacity AS materialized (
		    SELECT
		        suc.store_code,
		        COALESCE(SUM(suc.unit_capacity), 0) AS store_capacity,
		        COALESCE(SUM(suc.unit_capacity), 0) - sci.total_inv AS net_available_capacity,
		        sci.total_inv
		    FROM
		        inventory_smart.store_unit_capacity suc
		        JOIN inventory_smart.store_current_inventory sci USING (store_code)
		    GROUP BY suc.store_code, sci.total_inv
		),
		plan_master AS materialized (
		    select * from (
		        SELECT 
		        	plan_code,
		            plan_code as allocation_name,
		            created_at,
		            type as plan_type,
					status,
		            CASE
				      WHEN type in (0, 4, 5) THEN 'Manual'
				      ELSE 'Auto'
				  	END
				    AS allocation_type
		        FROM inventory_smart.plan_master
		        WHERE  status IN (2) 
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
		    ) x 
		)
		,plan_master_finalised AS materialized (
		    select * from (
		        SELECT 
		        	plan_code,
		            plan_code as allocation_name,
		            created_at,
		            type as plan_type,
		            status,
		            CASE
				      WHEN type in (0, 4, 5) THEN 'Manual'
				      ELSE 'Auto'
				  	END
				    AS allocation_type
		        FROM inventory_smart.plan_master
		        WHERE  status IN (3)
		            AND is_deleted = false 
		            AND updated_at >= CURRENT_DATE AT TIME ZONE 'America/Chicago'
		            AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Chicago'
		    ) x 
		)
		,final_plan_master AS materialized (
			SELECT * FROM plan_master
			UNION ALL
			SELECT * FROM plan_master_finalised
		)
		,unfiltered_plans_store_allocated_total AS (
			select
				carfg.store,
				carfg.allocated_total,
				carfg.created_at,
				plm.status
			from inventory_smart.create_allocation_result_flat_gurobi AS carfg
			inner join final_plan_master plm on plm.plan_code = carfg.allocation_code
			inner join store_filters sf on sf.store_code = carfg.store
		)
		,ob_data AS (
			SELECT store as store_code, SUM(allocated_total) AS ob
			FROM unfiltered_plans_store_allocated_total a
			GROUP BY store_code
		)
		,filter_allocations_pre_base as materialized (
        	select * from (
        		select 
            		carfg.*,
            		CASE
				      WHEN inventory_source='dc' THEN 'B'
				      WHEN inventory_source='po' THEN 'L'
				      WHEN inventory_source='ns' THEN 'S'
				      ELSE ''
				  	END
				    AS po_type,
				    plm.allocation_type,
				    plm.allocation_name
            	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
				INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
				where
					exists (select 1 from product_filters b where carfg.article=b.article)
					AND carfg.created_at >= (Date(now() AT TIME ZONE 'America/Chicago' - interval '30 day')::timestamp )
					AND carfg.created_at <= (date(now() AT TIME ZONE 'America/Chicago' + interval '1 day')::timestamp)
            ) a %3$s
        ),
		filter_allocations_pre as materialized (
                select * from filter_allocations_pre_base
            ),
		filter_allocations as materialized (
				SELECT
					js.key as dc_code,
					store,
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
		),
		allocation_base_with_out_store_filters AS materialized (
			select a.* ,
			dpc.pack_type,
			dpc.units_in_pack,
			a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
			a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
			from filter_allocations a
			JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
		),
		allocation_base AS materialized (
			select a.*,
			sf.store_name as store_name
			from allocation_base_with_out_store_filters a
			INNER JOIN store_filters sf ON a.store = sf.store_code
		),
		base_dc_article AS materialized (
			SELECT dc_code, article
			FROM allocation_base
			GROUP BY 1, 2
		),
		base_article AS materialized (
			SELECT  article
			FROM allocation_base
			GROUP BY 1
		),
		base_dpc as materialized (
			select article, pack_type, pack_type_id, sum(units_in_pack) as units_in_pack 
			from inventory_smart.dc_pack_configuration dpc
			where exists (select 1 from base_article b where dpc.article=b.article)
			group by 1,2,3
		),
		allocated_units_dc AS materialized (
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
						case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
						case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated
					FROM inventory_smart.sku_dc_allocated_units a
					left join base_dpc c using (article, pack_type_id)
					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
					) x
				GROUP BY 1, 2, 3, 4, 5
			) a
			group by 1,2
		),
		allocated_units_po AS materialized (
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
						case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
						case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated,
						sum(quantity) as overall_allocated
					FROM inventory_smart.sku_po_allocated_units a
					left join base_dpc c using (article, pack_type_id)
					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
					group by 1,2,3,4,5
					) x
				GROUP BY 1, 2, 3,4
			) a
			group by 1,2
		),
		allocated_units as materialized (
			select * from allocated_units_dc
			union all
			select * from allocated_units_po
		),
		available_units_dc as materialized (
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
						case when dpc.pack_type='eaches' then a.oh_packs else 0 end as eaches_available,
						case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
						a.oh as overall_available
					from inventory_smart.sku_dc_available_units a
					left join base_dpc dpc using(article,pack_type_id)
					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		),
		available_units_po as materialized (
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
						case when dpc.pack_type='eaches' then a.oh_eaches else 0 end as eaches_available,
						case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
						a.oh as overall_available
					from inventory_smart.sku_po_available_units a
					left join base_dpc dpc using(article,pack_type_id)
					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.po_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		),
		available_units as materialized (
			select * from available_units_dc
			union all
			select * from available_units_po
		),
		reserve_units_dc as materialized (
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
						case when dpc.pack_type='eaches' then a.quantity else 0 end as eaches_reserved,
						case when dpc.pack_type='packs' then a.quantity else 0 end as packs_reserved,
						a.quantity * coalesce(dpc.units_in_pack,1) as overall_reserved
					from inventory_smart.dc_pack_reserve_quantity a
					left join base_dpc dpc using(article,pack_type_id)
					where reservation_till_date >= (now() at time zone 'America/Chicago')::date
					and exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		),
		net_available as materialized (
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
			from available_units a 
			left join allocated_units b using (article,dc_code)
			left join reserve_units_dc c using(article,dc_code)
		),
		article_store_dc_mapping as (
			select distinct article, store_code, dc_code 
			from allocation_base as ab
			INNER JOIN store_filters sf ON ab.store = sf.store_code
		),
		store_level_final_inv as materialized (
			select store_code, 
				sum(net_eaches_available) as net_eaches_available,
				sum(net_packs_available) as net_packs_available,
				sum(net_overall_available) as net_overall_available
			from (
				select 
					a.*, 
					coalesce(b.net_eaches_available,0) as net_eaches_available,
					coalesce(b.net_packs_available,0) as net_packs_available,
					coalesce(b.net_overall_available,0) as net_overall_available
				from article_store_dc_mapping a
				left join net_available b using(article, dc_code)
			) a
			group by 1
		),
		pack_type_level_split as materialized(
			select 
				article, 
				store,
				allocation_code,
				dc_code,
				pack_type_id,
				pack_type,
				SUM(COALESCE(a.units_in_pack, 1)) AS total_units_in_pack,
				AVG(coalesce(packs_allocated_qty, 0)) as packs_allocated_qty,
				AVG(coalesce(packs_available_qty, 0)) as packs_available_qty
			from allocation_base_with_out_store_filters a
			group by 1, 2, 3, 4, 5, 6
		),
		allocation_split as materialized (
			select 
				pts.store,
				sum(case when pts.pack_type = 'packs' then pts.packs_allocated_qty else 0 end) as allocated_packs,
				sum(case when pts.pack_type = 'eaches' then pts.packs_allocated_qty else 0 end) as allocated_eaches
			from pack_type_level_split pts
			INNER JOIN store_filters sf ON pts.store = sf.store_code
			group by pts.store
		),
		pre_final as materialized (
		select
		    a.store,
		    a.store_name,
		    COALESCE(SUM(a.allocated_qty), 0) AS allocated_total,
		    COUNT(DISTINCT a.article) AS style_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count
		FROM
		    allocation_base a
		GROUP BY 
		    a.store, 
		    a.store_name
		),
		pre_final_with_alloc as materialized (
		select
		    a.store,
		    a.store_name,
		    a.allocated_total,
		    a.style_count,
		    a.allocation_count,
		    ROUND(COALESCE(allo_split.allocated_eaches, 0), 0) AS store_level_eaches,
		    ROUND(COALESCE(allo_split.allocated_packs, 0), 0) AS store_level_packs
		FROM
		    pre_final a
		LEFT JOIN allocation_split allo_split ON allo_split.store = a.store
		)
		SELECT
		    ab.store,
		    ab.store_name,
		    ab.allocated_total,
		    ab.style_count,
		    ab.allocation_count,
		    ab.store_level_eaches,
		    ab.store_level_packs,
		    c.net_overall_available AS available_total,
		    c.net_eaches_available AS store_level_eaches_available,
		    c.net_packs_available AS store_level_packs_available,
		    cap.store_capacity,
		    COALESCE(cap.net_available_capacity, 0) - COALESCE(ob.ob, 0) AS net_available_capacity,
		    CASE WHEN COALESCE(cap.store_capacity, 0) > 0
		         THEN (COALESCE(cap.total_inv, 0) + COALESCE(ob.ob, 0)) / cap.store_capacity
		         ELSE 0 END AS store_to_perc_cap
		FROM
		    pre_final_with_alloc ab
		LEFT JOIN store_level_final_inv c ON ab.store = c.store_code
		LEFT JOIN capacity cap ON cap.store_code = ab.store
		LEFT JOIN ob_data ob ON ob.store_code = ab.store
    $$, _query_pa, _query_sa, _query_cus);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_store', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
    end
$function$
;

