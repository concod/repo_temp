--liquibase formatted sql
--changeset liquibase:capacity_breach runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for capacity_breach
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach(character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach(character varying)
 RETURNS TABLE(article character varying, dc_code integer, channel character varying, store_code character varying, store_name character varying, size character varying, oh_it_oo integer, packs text[], packs_allocated integer, loose_units_allocated integer, allocated_quantity integer, dc_avail_art integer, allocated_quantity_size integer, dc_available_size_final integer, article_store_allocated_units_other integer, l1_name character varying, unit_capacity integer, current_allocation_for_store integer, net_available_capacity integer)
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.capacity_breach
  * Created by: Renugopal S
  * Created at: 01-01-2023
  * No of input parameter: 2
  * Parameter Description : 1 = Ref Cursor
  *                         2 = Allocation Code
 
  * Purpose: 
  * This function is created to calculate capacity breach after allocation at a store department(l1) level
  * Finalize screen of Allocate flow - 3rd tab
  * Calling Statement:
  *  select * from inventory_smart.capacity_breach
 
 	begin;
 	select * from inventory_smart.capacity_breach
 	    ('my_cur',
 	     '6_3_FactoryLineRetail_20221209T134912');
 	 FETCH ALL IN "my_cur";
 	commit;
 	
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
 declare
 	_query_combine text:= '';
 
 
     begin
 
 			
 	_query_combine := '
 
 with base as (
 select
 	carfs.article,
 	channel,
 
 	TRIM("store") as store_code,
 	TRIM("retail_size_cd") as size,
 	TRIM(allocation_code) as allocation_code,
 
 	saf.store_name,
 	pack_dc_allocation,
 
 
 	jsonb_object_keys(pack_dc_allocation)::int as dc_code
 
 from
 	inventory_smart.create_allocation_result_flat_gurobi  carfs
 left join "global".store_attributes_filter saf 
         on
 	store_code = store
 
 	where
        allocation_code = '''|| $1 ||'''  
 
 )
 --select * from base;
 
 ,allocation as (SELECT x.article,
     x.dc_code::int,
     x.store_code,
     x.store_name,
     x.channel,
     unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::text[]) as pack_type_id,
 	unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated_qty''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::double precision[]) as allocated_qty
 	from (SELECT carfs.article,
 	        saf.store_code,
 	        saf.store_name,
 	        saf.channel,
 	        js.items AS dc_code,
 	        js.value AS inventory_data
 	       FROM base carfs
 	         CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
 	         JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store_code::text
 	         group by 1,2,3,4,5,6) x),	                             
 packs AS (
          SELECT dpc.article,
             allocation.dc_code,
             allocation.store_code,
             allocation.store_name,
             dpc.pack_type_id,
             dpc.size,
             allocation.channel,
             allocated_qty as packs_allocated_qty,
             allocation.allocated_qty * dpc.units_in_pack::double precision AS allocated_qty
            FROM inventory_smart.dc_pack_configuration dpc
              JOIN allocation USING (article, pack_type_id)
         )
         --select * from allocation
         ,
 packs_base as (
 	SELECT allocation.article,
     allocation.dc_code,
     allocation.store_code,
     allocation.store_name,
     allocation.pack_type_id,
     allocation.pack_type_id as size,
     allocation.allocated_qty,
     allocation.channel,
     allocation.allocated_qty as packs_allocated_qty,
     ''E'' as type
    FROM allocation
   WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
            FROM packs))
 UNION
  SELECT packs.article,
     packs.dc_code,
     packs.store_code,
     packs.store_name,
     packs.pack_type_id,
     packs.size,
     packs.allocated_qty,
     packs.channel,
     packs.packs_allocated_qty,
     ''S'' as type
    FROM packs
 )
 --select * from packs_base;
 ,
 pack_level_agg as (
 	select dc_code, article, store_code, store_name, size, type, array_agg(distinct pack_type_id) packs, sum(allocated_qty) allocated_qty, sum(packs_allocated_qty) packs_allocated_qty  from packs_base group by 1,2,3,4,5,6
 )
 --select * from pack_level_agg;
 
 
 ,
 store_allocations_cte as (
 	select dc_code, article, store_code, store_name, packs, size, coalesce(packs_allocated,0) packs_allocated, coalesce(loose_units_allocated,0) loose_units_allocated from
 	(select dc_code, article, store_code, store_name, packs, size, sum(packs_allocated_qty) packs_allocated, sum(allocated_qty) s_allocated_qty from pack_level_agg where type = ''S''
 	group by 1,2,3,4,5,6) a 
 	full join 
 	(select dc_code, article, store_code, store_name, size, sum(packs_allocated_qty) loose_units_allocated, sum(allocated_qty) e_allocated_qty from pack_level_agg where type = ''E''
 	group by 1,2,3,4,5
 	) b
 	using (dc_code, store_code, store_name, article, size)
 )
 --select * from store_allocations_cte;

 ,
 allocated_unit as (
 	select article, store_code, store_name, dc_code, channel, pack_type_id, size, sum(allocated_qty) allocated_total from packs_base group by article, store_code, store_name, dc_code, channel, pack_type_id, size
 )
 --select * from store_allocations_cte
 ,
 current_allocation as (
 select dc_code, channel, article, size, sum(oh) inv_avai from (
 select 
 dc_code, channel, article, pack_type_id, size, coalesce(oh,0) oh, coalesce(it, 0) it, coalesce(oo,0) oo
 from
 	packs_base am
 left join inventory_smart.sku_dc_available_units sa 
 using (dc_code, channel, article, pack_type_id, size)
 group by 1,2,3,4,5,6,7,8) a
 group by 1,2,3,4
 )
 --select * from current_allocation
 ,
 new_base as (
 select * from base right join packs_base using (article, channel, dc_code, store_code, store_name, size)
 )
 --select * from new_base
 ,strategy_table AS(
   SELECT
     b.*, 
     eld.allocated_total, 
     ca.inv_avai
   FROM
     new_base b 
     join allocated_unit eld using (article, store_code, dc_code, channel, pack_type_id, size)
     join store_allocations_cte sac  using (dc_code, store_code, article, size)
     join current_allocation ca using (dc_code, article, size)
     )
 --select * from strategy_table;
 , 
 
 --select * from aps_split;
 
 
 
 strategy_table_size_level as (
 select
 	*,
 	(inv_avai_size - SUM(allocated_quantity_size) over(partition by dc_code,
 	size, article)) as dc_available_size_final,
 	SUM(allocated_quantity_size) over(partition by dc_code,
 	article) as allocated_total,
 	(SUM(inv_avai_size) over(partition by dc_code,
 	store_code, article) - SUM(allocated_quantity_size) over(partition by dc_code, article)) as dc_avai_art-- net available
 from
 	(
 	select
 		article,
 		channel,
 		store_code,
 		store_name,
 		dc_code,
 		size,
 		SUM(allocated_total) as allocated_quantity_size,
 		max(inv_avai) as inv_avai_size
 	from
 		strategy_table st
 	group by
 		1,
 		2,
 		3,
 		4,
 		5,
 		6
     )
     as a 
 )
 --select * from strategy_table_size_level;
 ,
 other_allocations as (
 select dc_code, channel, article, size,  sum(allocated_reserve_qty) as allocated_reserve_qty from (
 select 
 dc_code, channel, article, pack_type_id, size, coalesce(quantity,0) as allocated_reserve_qty
 from
 	packs_base am
 join inventory_smart.sku_dc_allocated_units 
 using (dc_code, channel, article, size, pack_type_id)
 group by 1,2,3,4,5,6) a
 group by 1,2,3,4
 ),
 		other_allocations_to_store as (
 		select
 			store_code,
 			channel,
 			article,
 			sum(allocated_reserve_qty) as article_store_allocated_units_other
 		from
 			(
 			select
 				am.store_code,
 				am.channel,
 				article,
 				pack_type_id,
 				size,
 				coalesce(quantity, 0) as allocated_reserve_qty
 			from
 				packs_base am
 			join inventory_smart.sku_store_allocated_units
 					using (article,
 				size,
 				pack_type_id,
 				store_code
 				)
 			group by
 				1,
 				2,
 				3,
 				4,
 				5,
 				6) a
 		group by
 			1,
 			2,
 			3
 		),
 
 reserve_allocation as (
 select 
 dc_code, channel, article, size, sum(coalesce(quantity,0)) user_reserve_qty  
 from
 	packs_base am
 left join inventory_smart.sku_dc_reserved_units sdru 
 using (dc_code, channel, article, size)
 group by 1,2,3,4
 ),
 
 		article_store_inv as (
 		select
 		
 			a.article,
 			a.store_code,
 			sum(oh) + sum(it) + sum(oo) as oh_it_oo
 		from
 			(
 			select
 				am.article,
 				am.store_code,
 				--pack_type_id,
 				size,
 				coalesce(oh, 0) oh,
 				coalesce(it, 0) it,
 				coalesce(oo, 0) oo
 			from
 				packs_base am
 				--join  global.product_attributes_filter paf on am.article = paf.article and am.pack_type_id = paf.size
 			left join inventory_smart.sku_store_inventory sa
 					using (store_code,
 				article,
 				size)
 			group by
 				1,
 				2,
 				3,
 				4,
 				5,
 				6
 				--,
 				--7
 				) a
 		group by
 			1,
 			2
 		)
 		--select * from article_store_inv;

 		,
 strategy_table_size_level_reserve as (
 select 
 	stsf.article,
 	stsf.store_code,
 	stsf.store_name,
	stsf.channel,
 	pm.l1_name,
 	asi.oh_it_oo,
 	stsf.dc_code,
 	COALESCE(oas.article_store_allocated_units_other, 0) as article_store_allocated_units_other,
 	stsf."size",
 	allocated_quantity_size,
 	inv_avai_size,
 	dc_available_size_final,
 	allocated_total,
 	dc_avai_art,
 	dc_avai_art - COALESCE(oa.allocated_reserve_qty, 0) - COALESCE(ra.user_reserve_qty, 0) as net_available
 from strategy_table_size_level stsf
 left join reserve_allocation ra using (article, size, dc_code, channel)
 left join other_allocations oa using (article, size, dc_code, channel)
  left join article_store_inv asi using(article, store_code)
 left join other_allocations_to_store oas using (article, store_code, channel)
 join inventory_smart.ph_master pm using(channel, article)
 
 )
 --select * from strategy_table_size_level_reserve;
 ,
 allocations_at_store_level as (
 select store_code, l1_name, sum(allocated_quantity_size) current_allocation_for_store, sum(oh_it_oo) oh_it_oo_store
 from strategy_table_size_level_reserve sac
  group by 1,2
 )
 --select * from allocations_at_store_level;
 ,
 
 final_table as (
 select
 	article,
 	stsl.dc_code as dc_code,
	stsl.channel,
 	psd.store_code,
 	psd.store_name,
 	stsl.size::varchar,
 	oh_it_oo::integer,
 	psd.packs,
 	psd.packs_allocated::integer,
 	psd.loose_units_allocated::integer,
 	stsl.allocated_total::integer as allocated_quantity,---
 	stsl.net_available::integer as DC_Avail_Art,
 	stsl.allocated_quantity_size::integer,
 	stsl.dc_available_size_final::integer,
 	stsl.article_store_allocated_units_other::integer,
 	stsl.l1_name,
 	round(suc.unit_capacity)::integer as unit_capacity,
	asl.current_allocation_for_store::integer,--at store level for all articles and sizes
	--(psd.packs_allocated + psd.loose_units_allocated)::integer as current_allocation_for_store,
	(round(suc.unit_capacity) - asl.current_allocation_for_store -oh_it_oo_store)::integer as  net_available_capacity
 from
 	store_allocations_cte psd
 join
       strategy_table_size_level_reserve stsl using (store_code, article, size)
 left join allocations_at_store_level asl using(store_code, l1_name)
 left join inventory_smart.store_unit_capacity suc 
 	on
 	product_hierarchy = stsl.l1_name
 	and suc.store_code = stsl.store_code
 )
 select
 	*
 from
 final_table';
 			raise notice '%', _query_combine;
           --  OPEN $1 FOR execute _query_combine;  
            --raise notice 'aha';
 		RETURN QUERY execute _query_combine;	
 		--RETURN $1;
         end
 $function$
;
