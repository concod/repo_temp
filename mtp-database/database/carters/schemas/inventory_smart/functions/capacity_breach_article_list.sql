--liquibase formatted sql
--changeset liquibase:capacity_breach_article_list runOnChange:true stripComments:false splitStatements:false context:MTP-112262 labels:MTP-112262
--comment: MTP-112262 changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_article_list(character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach_article_list(character varying, character varying)
 RETURNS TABLE(article character varying, l2_name character varying, l3_name character varying, l4_name character varying, l5_name character varying, style_description text, style character varying, pack_type_id text, dc_code character varying, current_allocation integer, remaining_available integer, total_allocated integer, allocated_reserve integer)
 LANGUAGE plpgsql
AS $function$

declare
	_query_combine text:= '';
	_allocation_code text:= $1;
	_store_code text:= $2;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin			
_query_combine := '
with articles_in_store as (
/* Get articles in chosen store for allocation code */
	select 
		article
		,allocation_code
		,created_at
	from
		inventory_smart.create_allocation_result_flat_gurobi carfg 
	where 
		allocation_code = '''|| _allocation_code ||'''
		and store = '''|| _store_code ||'''
)
--select * from articles_in_store

,current_allocation_qty_collapsed as (	
	select 
		carfs.allocation_code,
		carfs.article,
		carfs.store as store_code,
		js.items::integer as dc_code,
		js.value as inventory_data,
		max(carfs.updated_at) as updated_at
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	cross join lateral jsonb_each_text(carfs.pack_dc_allocation) js(items,value)
	where
		allocation_code = '''|| _allocation_code ||'''
		and store = '''|| _store_code ||'''
	group by 1,2,3,4,5
)
--select * from current_allocation_qty_collapsed

,total_allocated_qty as (
select allocation_code,
		article,
		pack_type_id,
		dc_code,
		sum(current_allocation) as total_allocated 
		from ( 
select 
		allocation_code,
		article,
		dc_code,
		unnest(replace(replace(inventory_data::jsonb ->> ''packs_allocated''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::text[]) AS pack_type_id,
		unnest(replace(replace(inventory_data::jsonb ->> ''packs_allocated_qty''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::double precision[]) AS current_allocation
	from (
select 
		carfs.allocation_code,
		carfs.article,
		carfs.store as store_code,
		js.items::integer as dc_code,
		js.value as inventory_data
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	cross join lateral jsonb_each_text(carfs.pack_dc_allocation) js(items,value)
	where
		allocation_code = '''|| _allocation_code ||'''
		group by 1,2,3,4,5
	) pack_allocation) x
	group by 1,2,3,4
)

, current_allocation_qty as(
	select 
		allocation_code,
		article,
		store_code,
		dc_code,
		unnest(replace(replace(inventory_data::jsonb ->> ''packs_allocated''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::text[]) AS pack_type_id,
		unnest(replace(replace(inventory_data::jsonb ->> ''packs_allocated_qty''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::double precision[]) AS current_allocation
	from current_allocation_qty_collapsed
)
-- select * from current_allocation_qty
,reserve_allocation as (
					SELECT dc_code, pack_type_id, avg(COALESCE(quantity/coalesce(dpc.units_in_pack,1),0)) user_reserve_qty 
					FROM (
						SELECT dc_code, article, pack_type_id FROM current_allocation_qty
						GROUP BY 1, 2, 3
					) am
					LEFT JOIN (
					SELECT * FROM inventory_smart.sku_dc_reserved_units where  (article, dc_code) in (SELECT article, dc_code FROM current_allocation_qty)
					) b
					USING (dc_code, article, pack_type_id)
					join inventory_smart.dc_pack_configuration dpc using(article, pack_type_id)
					GROUP BY 1, 2
				)  
, allocation_metrics_for_date as ( 
/* get total allocated, available and reserve for all allocation codes that day */
	select 
		article
		,pack_type_id
		,dc_code
		,coalesce(avg(sdau.oh/greatest(sdau.units_in_pack,1)), 0)  as total_avail
		,coalesce(avg(sdru.quantity), 0) as allocated_reserve
		,coalesce(avg(sdalu.packs_allocated), 0) as total_allocated
	from
		(
		select * from inventory_smart.sku_dc_allocated_units sdalu where article in (select article from articles_in_store)
		) sdalu
		right join (
			select * from inventory_smart.sku_dc_available_units sdau where article in (select article from articles_in_store) 
			) sdau using(article, pack_type_id, dc_code)
		left join (
		select * from inventory_smart.sku_dc_reserved_units sdru where article in (select article from articles_in_store) 
		)sdru using(article, pack_type_id, dc_code)
	group by 1,2,3		
)
--select * from allocation_metrics_for_date
, final_table as ( 
/* Calculate Remaining available to allocate here = available - (allocated + reserve) */
	select 
		caq.article
		,caq.pack_type_id
		,dc_code
		--,coalesce(sum(caq.current_allocation), 0) as current_allocation
		,coalesce(sum(amd.allocated_reserve), 0) as allocated_reserve
		,coalesce(sum(caq.current_allocation), 0) as total_allocated
		,coalesce(sum(amd.total_avail), 0) - coalesce(sum(amd.total_allocated), 0)  - coalesce(sum(taq.total_allocated),0)  - COALESCE(avg(user_reserve_qty),0) as remaining_available
	from
		current_allocation_qty caq
		left join allocation_metrics_for_date amd using(article, pack_type_id, dc_code)
		left join total_allocated_qty taq using(article,pack_type_id,dc_code)
		left join reserve_allocation ra using(pack_type_id,dc_code)
	group by 1,2,3
)

, final_result as (
	select 
		ft.article
		,paf.l2_name
		,paf.l3_name
		,paf.l4_name
		,paf.l5_name
		,paf.product_description as style_description
		,paf.style
		,ft.pack_type_id
		,CASE 
			WHEN dcs.linked_store_code LIKE ''%_dc'' THEN LEFT(dcs.linked_store_code, LENGTH(dcs.linked_store_code) - 3)
			ELSE dcs.linked_store_code
		END AS dc_code
		,coalesce(sum(caq.current_allocation), 0)::integer as current_allocation
		,sum(ft.remaining_available)::integer as remaining_available
		,sum(ft.total_allocated)::integer as total_allocated
		,sum(ft.allocated_reserve)::integer as allocated_reserve
	from 
		final_table ft
		join inventory_smart.ph_master paf using (article)
		join global.distribution_centres dcs using (dc_code)
		join current_allocation_qty caq using(article,pack_type_id,dc_code)
	group by 1,2,3,4,5,6,7,8,9
)
select * from final_result
';
	raise notice '%', _query_combine;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.capacity_breach_article_list', 'Before executing dynamic query',_query_combine,jsonb_build_object('_allocation_code',_allocation_code,'_store_code',_store_code));
	RETURN QUERY execute _query_combine;	
	end
$function$
;