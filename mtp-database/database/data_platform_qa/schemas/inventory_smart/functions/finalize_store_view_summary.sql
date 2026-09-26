--liquibase formatted sql
--changeset liquibase:finalize_store_view_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for finalize_store_view_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.store_view_summary
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 							$3 = Ignore allocation code
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	begin;
	select * from inventory_smart.finalize_store_view_summary
	    ('my_cur',
	     'RG_TEST_22_SEPT');
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





----store summary



with strategy_table as (
select
	a.*,
	name as dc_name
from
	(
	select
		carfs.article,
		carfs.retail_size_cd as size,
		carfs.store as store_code,
		coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
		channel,
		JSONB_OBJECT_KEYS(pack_dc_allocation)::int as dc_code,
		pack_dc_allocation
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	left join "global".store_attributes_filter saf 
                on
                store_code = store

	where
		allocation_code = '''|| $2 ||'''
    ) a
left join global.distribution_centres dcs using(dc_code)
),
allocation as (SELECT x.article,
    x.dc_code::int,
    x.store_code,
    x.channel,
    unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::text[]) AS pack_type_id,
    unnest(replace(replace(x.inventory_data::jsonb ->> ''packs_allocated_qty''::text, ''[''::text, ''{''::text), '']''::text, ''}''::text)::double precision[]) AS allocated_qty
	from (SELECT carfs.article,
	        saf.store_code,
	        saf.channel,
	        js.items AS dc_code,
	        js.value AS inventory_data
	       FROM strategy_table carfs
	         CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
	         JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store_code::text
	         group by 1,2,3,4, 5) x),	                             
packs AS (
         SELECT dpc.article,
            allocation.dc_code,
            allocation.store_code,
            dpc.pack_type_id,
            dpc.size,
            allocation.channel,
            allocated_qty as packs_allocated_qty,
            allocation.allocated_qty * dpc.units_in_pack::double precision AS allocated_total
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (article, pack_type_id)
        ),
packs_base as (
	SELECT allocation.article,
    allocation.dc_code,
    allocation.store_code,
    allocation.pack_type_id,
    allocation.pack_type_id as size,
    allocation.allocated_qty as allocated_total,
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
    packs.pack_type_id,
    packs.size,
    packs.allocated_total,
    packs.channel,
    packs.packs_allocated_qty,
    ''S'' as type
   FROM packs
),
current_allocation as (
select dc_code, channel, article, sum(oh) dc_available, sum(it) it, sum(oo) oo from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(oh,0) oh, coalesce(it, 0) it, coalesce(oo,0) oo
from
	packs_base am
left join inventory_smart.sku_dc_available_units sa 
using (dc_code, channel, article, pack_type_id, size)
group by 1,2,3,4,5,6,7,8) a
group by 1,2,3
),
reserve_allocation as (
select 
dc_code, channel, article, max(coalesce(quantity,0)) user_reserve_qty  
from
	packs_base am
left join inventory_smart.sku_dc_reserved_units sdru 
using (dc_code, channel, article, size)
group by 1,2,3
),
other_allocations as (
select dc_code, channel, article, sum(allocated_reserve_qty) as allocated_reserve_qty from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(quantity,0) as allocated_reserve_qty
from
	packs_base am
join inventory_smart.sku_dc_allocated_units 
using (dc_code, channel, article, size, pack_type_id)
group by 1,2,3,4,5,6) a
group by 1,2,3
),
inventory_cte as (
-- cannot join at article size store level, because what if the same article size was allocated to different store
-- article size dc store level is how the allocated qty will work
-- net available inventory is wrt sku only and dc, not related to store
select 
	article,
	dc_code,
	channel,
	COALESCE(ca.dc_available, 0) as dc_available,
	COALESCE(oa.allocated_reserve_qty, 0) as allocated_reserve_qty,
	COALESCE(ra.user_reserve_qty, 0) as user_reserve_qty
    from 
		current_allocation ca
	left join other_allocations oa using (article, dc_code, channel)
	left join reserve_allocation ra using (article, dc_code, channel)
),
pack_level_agg as (
	select article, dc_code, store_code, size, type, array_agg(distinct pack_type_id) packs, sum(allocated_total) allocated_qty, sum(packs_allocated_qty) packs_allocated_qty  from packs_base group by 1,2,3,4,5
),
store_allocations_cte as (
	select article,dc_code, store_code, packs, coalesce(packs_allocated,0) packs_allocated, coalesce(loose_units_allocated,0) loose_units_allocated, coalesce(s_allocated_qty,0) + coalesce(e_allocated_qty,0) allocated_total from
	(select article, dc_code, store_code, packs, packs_allocated, sum(s_allocated_qty) s_allocated_qty from 
	(select article, dc_code, store_code, packs, size, sum(packs_allocated_qty) packs_allocated, sum(allocated_qty) s_allocated_qty from pack_level_agg where type = ''S''
	group by 1,2,3,4,5) x group by 1,2,3,4,5
	) a 
	full join 
	(select article, dc_code, store_code, sum(packs_allocated_qty) loose_units_allocated, sum(allocated_qty) e_allocated_qty from pack_level_agg where type = ''E''
	group by 1,2,3
	) b
	using (dc_code, store_code, article)
),
base as (
select
	article,
	store_code,
	dc_code,
    dc_name,
	coalesce(store_grade, ''-'') as store_grade,
	allocated_total as allocated_units,
	allocated_reserve_qty as allocated_reserve_qty,
	user_reserve_qty as user_reserve_qty,
	dc_available as Inventory_base
	
from
	inventory_cte carfs 
	join store_allocations_cte sac using (article, dc_code)
	join strategy_table st using (article, dc_code, store_code)
group by
	1,
	2,
	3,
	4,
    5,6,7,8,9
)
,
inventory as (
select
	dc_code,
	SUM(inventory_article) as Inventory
from
	(
	select
		article,
		dc_code,
		MAX(inventory_base) as inventory_article
	from
		base
	group by
		1,
		2
    ) as foo
group by
	1
),
cnt_table as (
select
	1 as key1,
	COUNT(distinct (( case when allocated_units > 0 then article  end ))) as art_cnt,
	COUNT(distinct (( case when allocated_units > 0 then store_code  end ))) as store_cnt
	--COUNT(distinct article) as art_cnt,
	--COUNT(distinct store) as store_cnt
from
	base
--where
--	allocated_units > 0
),
first_table as (
select
	*
from
	(
	select
		a.*,
		b.inventory - a.allocated_units_total-allocated_reserve_qty-user_reserve_qty as Inventory_available,
		1 as key1
	from
		(
		select
			dc_code,
			dc_name,
			SUM(allocated_units) as allocated_units_total,
            SUM(allocated_reserve_qty) as allocated_reserve_qty,
            SUM(user_reserve_qty) as user_reserve_qty
			
		from
        --base -- doing this for scenario where multiple article exists
                (
                   	select
						article,
						dc_code,
						dc_name,
						SUM(allocated_units) as allocated_units,
				        MAX(allocated_reserve_qty) as allocated_reserve_qty,
				        MAX(user_reserve_qty) as user_reserve_qty
					from
						base
					group by
						1,
						2,
						3
                ) bb2
	--	where
	--		allocated_units > 0
		group by
			1, 2
        ) as a
	left join inventory b
			using(dc_code)
    ) b
join cnt_table -- simply join 2 tables
		using(key1)
)
--select * from first_table;
,
second_table as (
select
	Avg(art_cnt) as style_depth
from
	(
	select
		store_code,
		Count(distinct article) as art_cnt
	from
		base
--	where
--		allocated_units > 0
	group by
		1
    ) as a
)
--select * from second_table;

,
grade_data as (
select
	*,
	case
		when store_grade = ''B'' then 0
		when store_grade = ''D'' then 1
		when store_grade = ''C'' then 2
		when store_grade = ''A'' then 3
		when store_grade = ''AA'' then 4
		when store_grade = ''AAA'' then 5
		when store_grade = ''-'' then 6
		else 6
	end as flag
from
	(
	select
		store_grade,
		SUM(allocated_units) as allocated_units, -- store grade level
		Count(distinct store_code) as stores,
		SUM(allocated_units) / COALESCE(Count(distinct store_code), 1) as average
	from
		base
	group by
		1
    ) as a
)
--select * from grade_data;
,
grade_b as (
select
	*
from
	grade_data
where
	flag = (
	select
		Min(flag)
	from
		grade_data
--	where
--		allocated_units <> 0 
)
),
grade_final as (
select
	a.*,
	
		(case when b.average !=0 THEN
        COALESCE(a.average,0) / COALESCE(b.average,1) 
        else 0
        END) as grade_index
from
	grade_data a
cross join grade_b b
)
select
	dc_code,
	dc_name as dc,
	art_cnt,
	store_cnt,
	Round(style_depth :: numeric, 2) as style_depth,
	allocated_units_total  as  allocated_total,--dc level
	inventory_available,
	store_grade,
	allocated_units,
	Round(grade_index :: numeric, 2) as grade_index
from
	first_table
cross join second_table
cross join grade_final
group by
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10


-----


				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
