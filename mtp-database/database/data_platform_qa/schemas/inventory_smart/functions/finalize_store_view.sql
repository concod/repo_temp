--liquibase formatted sql
--changeset liquibase:finalize_store_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for finalize_store_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(input refcursor, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view(input refcursor, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.store_view
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code

 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
 *  select * from inventory_smart.store_view
    ('my_cur',
     '')
 *
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

------ STORE VIEW TABLE DATA




with base as (
select
	article,
	carfs.style as style,
	carfs.style_description as description,
	carfs.color,
	carfs.color_code,
	trim("retail_size_cd") as size,
	TRIM("store") as store_code,
	channel,
	("demand") as demand,
	("ros") as ros,
	("oh") as oh,
	("oo") as oo,
	("it") as it,
	("oh_oo_intransit") as oh_oo_intransit,
	("wos") as wos,
	allocated_total as allocated_tot,
	TRIM(allocation_code) as allocation_code,
	aps,
	MIN,
	MAX,
	split_profile,
	saf.store_name,
	coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
	pack_dc_allocation,
	case
	  when
        demand_type = ''IA'' 
      then
        ''IA Forecast''
	  else
        demand_type
	end
    as demand_type,
	jsonb_object_keys(pack_dc_allocation)::int as dc_code
from
	inventory_smart.create_allocation_result_flat_gurobi carfs
left join "global".store_attributes_filter saf 
        on
	store_code = store
where
		allocation_code = '''|| $2 ||''' 

),
--select * from base;
allocated_articles_store_level as ( 
	select store_code, channel, COUNT( distinct ( case when allocated_tot > 0 then article end ) ) as Articles
	from base 
	group by 1,2
)
--select * from allocated_articles_store_level
,
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
	       FROM base carfs
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
pack_level_agg as (
	select dc_code, store_code, size, type, array_agg(distinct pack_type_id) packs, sum(allocated_total) allocated_qty, sum(packs_allocated_qty) packs_allocated_qty  from packs_base group by 1,2,3,4
),
store_allocations_cte as (
	select dc_code, store_code, packs, coalesce(packs_allocated,0) packs_allocated, coalesce(loose_units_allocated,0) loose_units_allocated, coalesce(s_allocated_qty,0) + coalesce(e_allocated_qty,0) allocated_total from
	(select dc_code, store_code, packs, packs_allocated, sum(s_allocated_qty) s_allocated_qty from 
	(select dc_code, store_code, packs, size, sum(packs_allocated_qty) packs_allocated, sum(allocated_qty) s_allocated_qty from pack_level_agg where type = ''S''
	group by 1,2,3,4) x group by 1,2,3,4
	) a 
	full join 
	(select dc_code, store_code, sum(packs_allocated_qty) loose_units_allocated, sum(allocated_qty) e_allocated_qty from pack_level_agg where type = ''E''
	group by 1,2
	) b
	using (dc_code, store_code)
),
strategy_table as (
select
	b.*,
	eld.allocated_total,
	--eld.inv_avai,--not req
	case
		when
        oh + it + oo >= MIN 
      then
        0
		else
        MIN - (oh + it + oo)
	end
    as min_short,
	case
		when
        eld.allocated_total >= 
        (
		case
			when
              oh + it + oo >= MIN 
            then
              0
			else
              MIN - (oh + it + oo)
		end
        )
      then
        (
		case
			when
            oh + it + oo >= MIN 
          then
            0
			else
            MIN - (oh + it + oo)
		end
        )
		else
          eld.allocated_total
	end
    as min_allocation,
	case
		when
        eld.allocated_total >= 
        (
		case
			when
              oh + it + oo >= MIN 
            then
              0
			else
              MIN - (oh + it + oo)
		end
        )
      then
        eld.allocated_total - (
		case
			when
            oh + it + oo >= MIN 
          then
            0
			else
            MIN - (oh + it + oo)
		end
        )
		else
          allocated_total - allocated_total
	end
    as wos_allocation
from
	base b
join
      store_allocations_cte eld using (store_code, dc_code) 
)
--select * from strategy_table;
, 
aps_split as (
select
		store_code,
		avg(aps_upd) as original_aps
from
		(
	select
				distinct article,
				store_code,
				split_profile * count(store_code) over(
					partition by article
				)* avg(aps_artlvl) over(
					partition by article
				) as aps_upd
	from
				(
		select
						article,
						store_code,
						max(split_profile) as split_profile,
						SUM(aps) as aps_artlvl
		from
						strategy_table
		group by
						1,
						2
				) as a
		) as b
group by
		1
) 
--select * from aps_split;
,
strategy_table_final_overall as (
select
	store_code,
	store_name,
	store_grade,
	SUM(demand) as demand,
	SUM(MIN) as MIN,
	SUM(MAX) as MAX,
	SUM(min_allocation) as min_allocation,
	SUM(wos_allocation) as wos_allocation,
	SUM(ros) as forecast_aps,
	SUM(oh) as oh,
	SUM(oo) as oo,
	SUM(it) as it,
	SUM(oh_oo_intransit) as oh_oo_intransit,
	SUM(demand * wos) / nullif(SUM(demand), 0) as target_wos,
	SUM(demand * current_wos) / nullif(SUM(demand), 0) as actual_wos,
	COUNT (distinct(
	case
		when
        allocated_total > 0 
      then
        article
	end
        )) as style_color_cnt
from
	(
	select
		article,
		store_code,
		store_name,
		store_grade,
		demand_type,
		MAX(demand) demand,
		MAX(MIN) MIN,
		MAX(MAX) MAX,
		SUM(min_allocation) as min_allocation,
		SUM(wos_allocation) as wos_allocation,
		MAX(ros) ros,
		MAX(oh) oh,
		MAX(oo) oo,
		MAX(it) it,
		MAX(oh_oo_intransit) oh_oo_intransit,
		MAX(wos) wos,
		SUM(allocated_total) allocated_total,
		((SUM(allocated_total) + MAX(oh_oo_intransit)) / nullif(MAX(ros), 0)) as current_wos
	from
		strategy_table st
	group by
		1,
		2,
		3,
		4,
		5
    )
    as st
left join
      (
	select
		article,
		COUNT(distinct size) as size_count
	from
		strategy_table
	group by
		1 
      )
      as artdet
		using(article)
group by
	1,
	2,
	3
)
--select * from strategy_table_final_overall;
,
strategy_table_size_level as 
(

	select
		store_code,
		dc_code,
		SUM(demand) as demand_size,
		SUM(sac.allocated_total) as allocated_total,
		SUM(oh) as oh_size,
		SUM(oo) as oo_size,
		SUM(it) as it_size,
		SUM(min_allocation) as min_allocation,
		SUM(wos_allocation) as wos_allocation ,
		SUM(MIN) as min_size,
		SUM(MAX) as max_size
	from
		strategy_table st
	left join store_allocations_cte sac using(dc_code, store_code)
	
	group by
		1,
		2
)
--select * from strategy_table_size_level;
,
final_table as (
select
	dcs.name as dc_name,
	articles,
	stsl.dc_code as dc_codes,
	stfo.store_code as store,
	stfo.store_name,
	stfo.store_grade,
	smf.climate,
	smf.country,
	--stsl.size,
	stfo.MIN,
	stfo.MAX,
	stfo.style_color_cnt,
	sac.packs,
	sac.packs_allocated,
	sac.loose_units_allocated,
	--stsl.allocated_total as Allocated_Total,
	--stsl.dc_avai_art,
	stsl.min_allocation as allocated_for_min,
	stsl.wos_allocation as allocated_for_wos,
	ROUND(aps.original_aps:: numeric, 2) as original_aps,
	ROUND(stfo.forecast_aps:: numeric, 2) as forecast_aps,
	ROUND(stfo.target_wos:: numeric, 2) as target_wos ,
	ROUND(stfo.actual_wos:: numeric, 2) as actual_wos,
	stfo.oh,
	stfo.oo,
	stfo.it,
	sac.allocated_total,
	stsl.oh_size,
	stsl.oo_size,
	stsl.it_size,
	stsl.min_size,
	stsl.max_size--,
	--stsl.dc_available_size_final
from
	strategy_table_final_overall stfo
join
      strategy_table_size_level stsl 
      on
	stfo.store_code = stsl.store_code
join (
	select
		distinct store_code,
		store_name,
		climate,
		country
	from
		global.store_attributes_filter
      )
      smf 
      on
	stfo.store_code = smf.store_code
left join store_allocations_cte sac on stsl.dc_code=sac.dc_code and  stfo.store_code = sac.store_code
LEFT JOIN global.distribution_centres dcs ON stsl.dc_code:: text = dcs.dc_code:: text
left join allocated_articles_store_level aasl on aasl.store_code = stfo.store_code-- and aasl.channel=sac.channel

join aps_split aps on 
		  stfo.store_code = aps.store_code
)
select
	*
from
	final_table
-----


				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;