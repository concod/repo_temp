--liquibase formatted sql
--changeset liquibase:order_batching_summary_style_figs_update runOnChange:true stripComments:false splitStatements:false context:MTP-112243 labels:MTP-112243
--comment: Order batching summary style function for FIGS | MTP-127128
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_style(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_style(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.order_batching_summary_style
 * Created by: Shekharkrishna Nirnakar
 * Created at: 2025-01-XX
 * No of input parameter: 4
 * Parameter Description : $1 = cursor
 *                        $2 = product filters str
 *                        $3 = store filters str
 *                        $4 = other filters str
 */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    _tz text := COALESCE(inventory_smart.get_tenant_timezone(), 'US/eastern');
begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    
    _query_combine := format($$
        WITH
		product_filters AS materialized (
			SELECT DISTINCT article, l1_name, l2_name, l3_name, style_name, color_name FROM
			global.product_attributes_filter %1$s
		)
		,store_filters AS materialized (
			SELECT DISTINCT store_code FROM
			global.store_attributes_filter %2$s                
		)
		,plan_master AS materialized (
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
					type IN (4, 5) 
				OR (
					type IN (0, 2) 
					AND updated_at >= CURRENT_DATE AT TIME ZONE %4$L
					AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
				)
			) 
			AND 
			created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
			AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
		)
		,filter_allocations_pre as materialized (
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
					CASE
						WHEN inventory_source='dc' THEN 'B'
						WHEN inventory_source='po' THEN 'L'
						WHEN inventory_source='ns' THEN 'S'
						ELSE ''
					END AS po_type,
					plm.plan_type as allocation_type,
					plm.allocation_name,
					oh_oo_intransit,
					carfg.pack_dc_allocation
				FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
				INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
				where exists (select 1 from product_filters b where carfg.article=b.article)
				and
					carfg.created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
					AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
			) a %3$s
		)
		,filter_allocations as materialized (
			select a.* 
			from filter_allocations_pre a
			where exists (select 1 from store_filters b where a.store=b.store_code)
		)
		,allocation_base_with_out_store_filters as (
			SELECT
				js.key as dc_code,
				store,
				allocated_total,
				allocation_code,
				inv_avai AS dc_available,
				article,
				retail_size_cd as size,
				pack_data.pack_type_id,
				pack_data.allocated_qty,
				pack_data.available_qty,
				'eaches' as pack_type
			FROM
				filter_allocations
				,jsonb_each(pack_dc_allocation) js
				CROSS JOIN LATERAL (
					SELECT 
						UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
						UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS allocated_qty,
						UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS available_qty
				) pack_data
				where pack_type_id = retail_size_cd
		)
--		select * from allocation_base_with_out_store_filters;
		,allocation_base AS materialized (
			select a.*
			from allocation_base_with_out_store_filters a
			INNER JOIN store_filters sf ON a.store = sf.store_code
		)
--		select * from allocation_base;
		,base_dc_article AS materialized (
			SELECT dc_code, article
			FROM allocation_base
			GROUP BY 1, 2
		)
--		select * from base_dc_article;
		,base_article AS materialized (
			SELECT  article
			FROM allocation_base
			GROUP BY 1
		)
--		select * from base_article;
		,base_dpc as materialized (
			select article, pack_type, pack_type_id, 1 as units_in_pack 
			from allocation_base
			where exists (select 1 from base_article b where allocation_base.article=b.article)
			group by 1,2,3
		)
--		select * from base_dpc;
		,allocated_units_dc AS materialized (
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
						c.article,
						c.pack_type_id,
						quantity,
						case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
						case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated
					FROM inventory_smart.sku_dc_allocated_units a
					join base_dpc c on a.article = c.article and a.size=c.pack_type_id--using (article, pack_type_id)
					WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text )
					) x
				GROUP BY 1, 2, 3, 4, 5
			) a
			group by 1,2
		)
--		select * from allocated_units_dc;
		-- TODO: Replace with actual query when inventory_smart.sku_po_allocated_units is created
		-- allocated_units_po AS materialized (
		-- 	select dc_code, article, sum(overall_allocated) AS overall_allocated, sum(eaches_allocated) AS eaches_allocated, sum(packs_allocated) AS packs_allocated
		-- 	from ( select dc_code, article, pack_type_id, packs_allocated, sum(overall_allocated) AS overall_allocated, sum(eaches_allocated) AS eaches_allocated
		-- 		from ( SELECT dc_code::text, article, pack_type_id,
		-- 			case when c.pack_type='eaches' then packs_allocated else 0 end AS eaches_allocated,
		-- 			case when c.pack_type='packs' then packs_allocated else 0 end AS packs_allocated,
		-- 			sum(quantity) as overall_allocated
		-- 			FROM inventory_smart.sku_po_allocated_units a
		-- 			join base_dpc c on a.article = c.article and a.size=c.pack_type_id--using (article, pack_type_id)
		-- 			WHERE exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
		-- 			group by 1,2,3,4,5 ) x
		-- 		GROUP BY 1, 2, 3, 4 ) a
		-- 	group by 1,2
		-- ),
		,allocated_units_po AS (
			select null::text as dc_code, null::text as article, 0::numeric as overall_allocated, 0::numeric as eaches_allocated, 0::numeric as packs_allocated where false
		)
		,allocated_units as materialized (
			select * from allocated_units_dc
			union all
			select * from allocated_units_po
		)
--		select * from allocated_units;
		,available_units_dc as materialized (
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
						dpc.pack_type_id,
						case when dpc.pack_type='eaches' then a.oh_packs else 0 end as eaches_available,
						case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
						a.oh as overall_available
					from inventory_smart.sku_dc_available_units a
					join base_dpc dpc on a.article = dpc.article and a.size=dpc.pack_type_id--using(article,pack_type_id)
					where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
				) a
				group by 1,2,3
			) b
			group by 1,2
		)
--		select sum(overall_available) from available_units_dc;
		-- TODO: Replace with actual query when inventory_smart.sku_po_available_units is created
		-- available_units_po as materialized (
		-- 	select dc_code, article, sum(eaches_available) as eaches_available, sum(packs_available) as packs_available, sum(overall_available) as overall_available
		-- 	from( select dc_code, article, pack_type_id, sum(eaches_available) as eaches_available, avg(packs_available) as packs_available, sum(overall_available) as overall_available
		-- 		from ( select a.article, a.dc_code::text, a.pack_type_id,
		-- 			case when dpc.pack_type='eaches' then a.oh_packs else 0 end as eaches_available,
		-- 			case when dpc.pack_type='packs' then a.oh_packs else 0 end as packs_available,
		-- 			a.oh as overall_available
		-- 			from inventory_smart.sku_po_available_units a
		-- 			join base_dpc dpc on a.article = dpc.article and a.size=dpc.pack_type_id--using(article,pack_type_id)
		-- 			where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
		-- 		) a group by 1,2,3
		-- 	) b group by 1,2
		-- ),
		,available_units_po AS (
			select null::text as dc_code, null::text as article, 0::numeric as eaches_available, 0::numeric as packs_available, 0::numeric as overall_available where false
		)
		,available_units as materialized (
			select * from available_units_dc
			union all
			select * from available_units_po
		)
--		select * from available_units;
		,reserve_units_dc as materialized (
			select dc_code::text, article,
				COALESCE(sum(quantity), 0) as eaches_reserved,
				0::numeric as packs_reserved,
				COALESCE(sum(quantity), 0) as overall_reserved
			from inventory_smart.sku_dc_reserved_units a 
			where exists (select 1 from base_dc_article b where b.article = a.article and b.dc_code::text = a.dc_code::text)
			group by 1, 2
		)
--		select sum(overall_reserved) from reserve_units_dc;
		,net_available as materialized (
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
		)
--		select * from net_available;
		,style_level_net_available as materialized (
			select 
				na.article,
				paf.l1_name,
				paf.l2_name,
				paf.l3_name,
				paf.style_name,
				paf.color_name,
				sum(na.net_eaches_available) as product_level_eaches_available,
				sum(na.net_packs_available) as product_level_packs_available,
				sum(na.net_overall_available) as dc_total_available
			from net_available na
			INNER JOIN product_filters paf ON paf.article = na.article
			group by na.article, paf.l1_name, paf.l2_name, paf.l3_name, paf.style_name, paf.color_name
		)
--		select * from style_level_net_available;
		,pack_type_level_split as materialized(
			select 
				article,
				store,
				allocation_code,
				dc_code,
				pack_type_id,
				pack_type,
				1 AS total_units_in_pack,
				AVG(coalesce(allocated_qty, 0)) as packs_allocated_qty,
				AVG(coalesce(available_qty, 0)) as packs_available_qty
			from allocation_base_with_out_store_filters a
			group by 1, 2, 3, 4, 5, 6
		)
		,allocation_split as materialized (
			select 
				pts.article,
				sum(case when pts.pack_type = 'packs' then pts.packs_allocated_qty else 0 end) as allocated_packs,
				sum(case when pts.pack_type = 'eaches' then pts.packs_allocated_qty else 0 end) as allocated_eaches
			from pack_type_level_split pts
			INNER JOIN store_filters sf ON pts.store = sf.store_code
			group by pts.article
		)
--		select * from allocation_split;
		,dc_available_summary AS materialized (
			SELECT
				article,
				product_level_eaches_available,
				product_level_packs_available,
				dc_total_available
			FROM style_level_net_available
		)
		,reserved_units_by_article AS materialized (
		    SELECT
		        rud.article,
		        COALESCE(SUM(rud.overall_reserved), 0) AS reserve_quantity
		    FROM
		        reserve_units_dc rud
		    WHERE EXISTS (SELECT 1 FROM base_article ba WHERE ba.article = rud.article)
		    GROUP BY rud.article
		)
--		select * from reserved_units_by_article;
		,pre_final as materialized (
		select
		    a.article,
		    MAX(paf.l1_name) as l1_name,
		    MAX(paf.l2_name) as l2_name,
		    MAX(paf.l3_name) as l3_name,
		    MAX(paf.style_name) as style_name,
		    MAX(paf.color_name) as color_name,
		    COALESCE(SUM(a.allocated_qty), 0) AS allocated_total,
		    ROUND(COALESCE(MAX(allo_split.allocated_eaches), 0), 0) AS product_level_eaches,
		    ROUND(COALESCE(MAX(allo_split.allocated_packs), 0), 0) AS product_level_packs,
		    COUNT(DISTINCT a.store) as store_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count,
		    COALESCE(MAX(slna.dc_total_available), 0) AS dc_net_available_inventory 
		FROM
		    allocation_base a
		LEFT JOIN style_level_net_available slna ON slna.article = a.article
		LEFT JOIN allocation_split allo_split ON allo_split.article = a.article
		LEFT JOIN product_filters paf ON paf.article = a.article
		GROUP BY 
		    a.article
		)
		SELECT
		    ab.l1_name as gender,
		    ab.l2_name as category,
		    ab.l3_name as class,
		    ab.style_name as style_description,
		    ab.article as style_color_id,
		    ab.color_name as color_name,
		    ab.product_level_eaches,
		    ab.product_level_packs,
		    ab.allocated_total as total_allocated_qty,
		    ab.store_count,
		    ab.allocation_count,
		    ab.dc_net_available_inventory as available_to_allocate,
		    ROUND(COALESCE(das.dc_total_available, 0)) AS available_total,
		    ROUND(COALESCE(das.product_level_eaches_available, 0)) AS product_level_eaches_available,
		    ROUND(COALESCE(das.product_level_packs_available, 0)) AS product_level_packs_available
		FROM
		    pre_final ab
		LEFT JOIN dc_available_summary das ON das.article = ab.article
		ORDER BY ab.article
    $$, _query_pa, _query_sa, _query_cus, _tz);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_style', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
end
$function$
;