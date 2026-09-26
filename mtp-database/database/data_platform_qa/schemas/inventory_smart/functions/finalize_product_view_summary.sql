--liquibase formatted sql
--changeset liquibase:finalize_product_view_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for finalize_product_view_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
 * Function/Procedure name: inventory_smart.product_view_summary
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 						   $3 = Ignore allocation code
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:

	begin;
	select * from inventory_smart.finalize_product_view_summary
	    ('my_cur',
	     '3_aignet_test_allocation_1',
	     '');
	 FETCH ALL IN "my_cur";
	commit;
	


 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare
	_query_combine text;

    begin


                _query_combine := '





----PRODUCT VIEW  summary
with allocation as (SELECT x.article,
    x.dc_code::int,
    x.store_code,
    x.channel,
    unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::text[]) AS pack_type_id,
    unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated_qty''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::double precision[]) AS allocated_qty
	from (SELECT carfs.article,
	        carfs.store as store_code,
	        saf.channel,
	        js.items AS dc_code,
	        js.value AS inventory_data
	       FROM inventory_smart.create_allocation_result_flat_gurobi carfs
	         CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
	         JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
	         where allocation_code = '''|| $2 ||''' group by 1,2,3,4, 5) x),	                             
packs AS (
         SELECT dpc.article,
            allocation.dc_code,
            allocation.store_code,
            dpc.pack_type_id,
            dpc.size,
            allocation.channel,
            allocation.allocated_qty * dpc.units_in_pack::double precision AS allocated_qty
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (article, pack_type_id)
        ),
base as (
	SELECT allocation.article,
    allocation.dc_code,
    allocation.store_code,
    allocation.pack_type_id,
    allocation.pack_type_id as size,
    allocation.allocated_qty,
    allocation.channel
   FROM allocation
  WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION
 SELECT packs.article,
    packs.dc_code,
    packs.store_code,
    packs.pack_type_id,
    packs.size,
    packs.allocated_qty,
    packs.channel
   FROM packs
),
current_allocation as (
select dc_code, channel, article, size, sum(oh) oh, sum(it) it, sum(oo) oo from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(oh,0) oh, coalesce(it, 0) it, coalesce(oo,0) oo
from
	base am
left join inventory_smart.sku_dc_available_units sa 
using (dc_code, channel, article, pack_type_id, size)
group by 1,2,3,4,5,6,7,8) a
group by 1,2,3,4
),
reserve_allocation as (
select 
dc_code, channel, article, size, 
--sum(coalesce(quantity,0)) user_reserve_qty  
max(coalesce(quantity,0)) user_reserve_qty 
from
	base am
left join inventory_smart.sku_dc_reserved_units sdru 
using (dc_code, channel, article, size)
group by 1,2,3,4
),
other_allocations as (
select dc_code, channel, article, size,  sum(allocated_reserve_qty) as allocated_reserve_qty from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(quantity,0) as allocated_reserve_qty
from
	base am
join inventory_smart.sku_dc_allocated_units 
using (dc_code, channel, article, size, pack_type_id)
group by 1,2,3,4,5,6) a
group by 1,2,3,4
),
first_table as (
--article count and store count
select
	count(distinct article) as art_cnt,
	count(distinct store_code) as store_cnt
from
	base
where
	allocated_qty > 0
),
second_table as (
--store average
select
	avg(store_count) as store_avg
from
	(
	select
		article,
		count(distinct store_code) as store_count
	from
		base
	where
		allocated_qty > 0
	group by
		1
    ) as a
),
third_table as (
select
	b.size,
	ast."order" as size_order,
	sum(allocated_qty) as allocated_size
from
	base b
	left join global.product_attributes_filter paf using (article, size)
	left join inventory_smart.article_status_tag ast using (product_code, channel)
group by
	1,
	2
),
fourth_table as (
select
	dc_code,
	name as dc_name,
size,
	SUM(allocated_qty) as allocated_qty,
	SUM(oh) as dc_available,
    SUM(allocated_reserve_qty) as allocated_reserve_qty,
    SUM(user_reserve_qty) as user_reserve_qty,
    coalesce(sum(oh),0) - coalesce(sum(allocated_reserve_qty), 0) - coalesce(sum(allocated_qty), 0) - coalesce(sum(user_reserve_qty), 0) as net_available
	-- for all skus in dc
from
	(
	select
		article,
		size,
		dc_code,
		SUM(allocated_qty) as allocated_qty
	from
		base
	group by
		1,
		2,
		3
    ) a
left join current_allocation using (article, size, dc_code)
left join reserve_allocation using (article, size, dc_code)
left join other_allocations using (article, size, dc_code)
left join "global".distribution_centres dd using (dc_code)
group by
	1,
	2,
   3
)
select
	dc_code,
	dc_name as dc,
	art_cnt,
	store_cnt,
	store_avg,
	size,
	size_order,
	allocated_size,
	allocated_qty,
	net_available as net_dc_available,
	allocation_perc
from
	(
	select
		*,
		case
			when allocated_qty = 0 then 0
			else allocated_size / allocated_qty
		end as allocation_perc
	from
		first_table
	cross join second_table
	cross join (
	select * from fourth_table left join third_table using(size)
	) foo
) a
order by
	size_order';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
