--liquibase formatted sql
--changeset liquibase:po_capacity_breach_article_list runOnChange:true stripComments:false splitStatements:false context:logic-changes labels:MTP-112262 
--comment: MTP-112262 changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_capacity_breach_article_list(character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_capacity_breach_article_list(character varying, character varying)
 RETURNS TABLE(article character varying, l2_name character varying, l3_name character varying, l4_name character varying, l5_name character varying, style_description text, style character varying, pack_type_id text, dc_code text, current_allocation integer, remaining_available integer, total_allocated integer, allocated_reserve integer)
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
		js.items as dc_code,
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

, allocation_metrics_for_date as ( 
/* get total allocated, available and reserve for all allocation codes that day */
	select 
		article
		,pack_type_id
		,dc_code
		,coalesce(sum(spau.total_avail), 0) as total_avail
		,sum(0) as allocated_reserve
		,coalesce(sum(spalu.packs_allocated), 0) as total_allocated
	from
		inventory_smart.sku_po_allocated_units spalu
		LEFT JOIN (
			select
				po_code::text as dc_code,
				pack_type_id,
				article,
				coalesce(sum(COALESCE(spau.oh, 0) / NULLIF(COALESCE(spau.units_in_pack, 1), 0)), 0) as total_avail
			from
				inventory_smart.sku_po_available_units spau
			group by 1,2,3
		) spau USING(dc_code, pack_type_id, article)
	where 
		article in (select article from articles_in_store)
	group by 1,2,3
		
)
--select * from allocation_metrics_for_date
, final_table as ( 
/* Calculate Remaining available to allocate here = available - (allocated + reserve) */
	select 
		caq.article
		,caq.pack_type_id
		,dc_code
		,coalesce(sum(caq.current_allocation), 0) as current_allocation
		,coalesce(sum(amd.allocated_reserve), 0) as allocated_reserve
		,coalesce(sum(amd.total_allocated), 0) as total_allocated
		,coalesce(sum(amd.total_avail), 0) - coalesce(sum(amd.total_allocated), 0) + coalesce(sum(amd.allocated_reserve), 0) as remaining_available
	from
		current_allocation_qty caq
		left join allocation_metrics_for_date amd using(article, pack_type_id, dc_code)
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
		,dc_code
		,sum(ft.current_allocation)::integer as current_allocation
		,sum(ft.remaining_available)::integer as remaining_available
		,sum(ft.total_allocated)::integer as total_allocated
		,sum(ft.allocated_reserve)::integer as allocated_reserve
	from 
		final_table ft
		join inventory_smart.ph_master paf using (article)
	group by 1,2,3,4,5,6,7,8,9
)
select * from final_result
 ';
 			raise notice '%', _query_combine;
           --  OPEN $1 FOR execute _query_combine;  
            --raise notice 'aha';
			   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_capacity_breach_article_list', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$1,'_store_code',$2)) ;		

 		RETURN QUERY execute _query_combine;	
 		--RETURN $1;
         end
 $function$
;