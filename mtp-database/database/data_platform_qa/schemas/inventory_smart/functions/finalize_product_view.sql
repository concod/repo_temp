--liquibase formatted sql
--changeset liquibase:finalize_product_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for finalize_product_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.finalize_product_view
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 							$3 = Store code
 * 							$4 = Ignore allocation codes
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:

	begin;
	select * from inventory_smart.finalize_product_view
	    ('my_cur',
	     '3_aignet_test_allocation_1',
	    '',
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
	_store_filter text;

    begin
	    _store_filter := '';


		if ($3 = '') IS FALSE
			then
				_store_filter := ' where store_code = '''||$3||''' ' ;
			end if;
		
	     _query_combine := ' 


------ PRODUCT VIEW - TABLE DATA



--- product view 2
WITH strategy_table AS (

        SELECT
            carfs.article,----
            carfs.style AS style,
            carfs.style_description AS description,
            carfs.color,
            inventory_source,
            carfs.color_code,
            trim("retail_size_cd") AS size,---
            saf.channel,
            --("inv_avai") AS Inv_Avai,
            trim("store") AS store_code,
            ("demand") AS Demand,
            ("ros") AS ROS,
            ("oh") AS OH,
            ("oo") AS OO,
            ("it") AS IT,
            ("oh_oo_intransit") AS OH_OO_InTransit,
            ("wos") AS WOS,
            ("allocated_total") AS Allocated_Total,
            ("allocated_total" + "oh_oo_intransit") / nullif("ros", 0) AS Current_WOS,
            aps,
            min,
            max,
            split_profile,
            pack_dc_allocation,
            selected_store_group_names as store_groups,
			selected_store_count as store_group_store_count,
            CASE WHEN demand_type = ''IA'' then  ''IA Forecast'' ELSE demand_type END AS demand_type
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        left join "global".store_attributes_filter saf 
         on
         store_code = store
	where
		allocation_code = '''|| $2 ||''' 

 
)
--select * from strategy_table;
,

recalculate_aps as 
(
select
	article,
	store_code,
	art_aps * str_cnt * split_profile as art_store_aps
from
	(
	select
		article,
		store_code,
		split_profile
	from
		strategy_table
	group by
		1,
		2,
		3 
    )
    as a
join
      (
	select
		article,
		AVG(aps) as art_aps,
		COUNT(distinct store_code) as str_cnt
	from
		(
		select
			article,
			store_code,
			SUM(aps) as aps
		from
			(
			select
				article,
				store_code,
				size,
				MAX(aps) as aps
			from
				strategy_table
			group by
				1,
				2,
				3
              )
              as a
		group by
			1,
			2 
          )
          as b
	group by
		1 
      )
      as c
		using(article) 
)
--select * from recalculate_aps;
,
aps_table as 
(
select
	article,
	store_code,
	SUM(ros) as ros_art,
	AVG(art_store_aps) as aps_art,
	SUM(demand) as demand_art
from
	(
	select
		article,
		store_code,
		size,
		MAX(ros) as ros,
		MAX(demand) as demand
	from
		strategy_table
	group by
		1,
		2,
		3
    )
    as a
join
      recalculate_aps
		using(article,
	store_code)
group by
	1,
	2 
)
--select * from aps_table;
,
strategy_table_final_size AS (
    SELECT
        article AS Article,
        size AS Size,
		channel,
        sum(Allocated_Total) AS Allocated_Quantity_size2

    FROM strategy_table
' || _store_filter || '
    GROUP BY 1, 2, 3
)
,
strategy_table_final_overall as 
(
select
	--strategy_table.order,
	article as article,
	channel,
	description,
	store_groups,
	store_group_store_count,
	inventory_source,
	demand_type,
	(array_remove(ARRAY_AGG(color), null))[1] as color,
SUM(demand) as demand,
	COUNT( distinct ( 
    case
      when
        allocated_total > 0 
      then
        store_code 
    end
) ) as store_code,
	SUM(MIN) as MIN,
	SUM(MAX) as MAX,
	case
		when
        SUM(demand_art) = 0 
      then
        AVG(aps_art)
		else
(SUM(demand_art * aps_art) / SUM(demand_art))
	end
    as original_aps,
	SUM(demand_art * ros_art) / nullif(SUM(demand_art), 0) as forecast_aps,
	case
		when
        SUM(demand_art) = 0 
      then
        AVG(wos)
		else
(SUM(demand * wos) / nullif(SUM(demand), 0))
	end
    as target_wos,
	SUM(demand * current_wos) / nullif(SUM(demand), 0) as actual_wos,
	SUM(oh_oo_intransit) as oh_oo_intransit,
	COUNT(distinct store_code) as count_store_size
from
	strategy_table
join
      aps_table
		using(article,
	store_code)
' || _store_filter || '
group by
	1,
	2,
	3,
	4,
	5,
	6,
	7
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
            allocation.allocated_qty * dpc.units_in_pack::double precision AS allocated_qty
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (article, pack_type_id)
        ),
pack_data_base as (
	SELECT allocation.article,
    allocation.dc_code,
    allocation.store_code,
    allocation.pack_type_id,
    allocation.pack_type_id as size,
    allocation.allocated_qty,
    allocation.channel,
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
    packs.allocated_qty,
    packs.channel,
    ''S'' as type
   FROM packs
)
,
current_allocation as (
select dc_code, channel, article, size, sum(oh) oh, sum(it) it, sum(oo) oo from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(oh,0) oh, coalesce(it, 0) it, coalesce(oo,0) oo
from
	pack_data_base am
left join inventory_smart.sku_dc_available_units sa 
using (dc_code, channel, article, pack_type_id, size)
group by 1,2,3,4,5,6,7,8) a
group by 1,2,3,4
),
reserve_allocation as (
select 
dc_code, channel, article, size, max(coalesce(quantity,0)) user_reserve_qty  
from
	pack_data_base am
left join inventory_smart.sku_dc_reserved_units sdru 
using (dc_code, channel, article, size)
group by 1,2,3,4
),
other_allocations as (
select dc_code, channel, article, size,  sum(allocated_reserve_qty) as allocated_reserve_qty from (
select 
dc_code, channel, article, pack_type_id, size, coalesce(quantity,0) as allocated_reserve_qty
from
	pack_data_base am
join inventory_smart.sku_dc_allocated_units 
using (dc_code, channel, article, size, pack_type_id)
group by 1,2,3,4,5,6) a
group by 1,2,3,4
),
allocated_qty_size_cte as (
select * from (select article, dc_code, channel, size, sum(allocated_qty) allocated_quantity_size from pack_data_base group by 1,2,3,4) a 
left join (select article, dc_code, channel, sum(allocated_qty) allocated_total_eaches from pack_data_base group by 1,2,3) b using (article, dc_code, channel)
),
pack_level_agg as (
	select article, dc_code, channel, size, type, array_agg(distinct pack_type_id) packs, sum(allocated_qty) allocated_quantity_size from pack_data_base group by 1,2,3,4,5
),
pack_data_agg as (
	select * from
	(select article, dc_code, channel, packs, packs_allocated from
	(select article, dc_code, channel, packs, size, sum(allocated_quantity_size) packs_allocated  from pack_level_agg where type = ''S''
	group by 1,2,3,4,5) x group by 1,2,3,4,5
	) a 
	full join 
	(select article, dc_code, channel, sum(allocated_quantity_size) loose_units_allocated from pack_level_agg where type = ''E''
	group by 1,2,3
	) b 
	using (article, dc_code, channel)
)
,
final_inv as (
	select
		dc_code,
		size,
		article,
		launch_date,
		l0_name, l1_name, l2_name,
		SUM(allocated_qty) as allocated_quantity_size,
		SUM(oh) as dc_available,
	    SUM(allocated_reserve_qty) as allocated_reserve_qty,
	    SUM(user_reserve_qty) as user_reserve_qty,
	    coalesce(sum(oh),0) - coalesce(sum(allocated_reserve_qty), 0) - coalesce(sum(allocated_qty), 0) - coalesce(sum(user_reserve_qty), 0) as net_available
	from
		(
		select
			article,
			size,
			dc_code,
			SUM(allocated_quantity_size) as allocated_qty
		from
			allocated_qty_size_cte
		group by
			1,
			2,
			3
	    ) a
	left join current_allocation using (article, size, dc_code)
	left join reserve_allocation using (article, size, dc_code)
	left join other_allocations using (article, size, dc_code)
	left join "global".distribution_centres dd using (dc_code)
	join "global".product_attributes_filter pmf using (article, size)
	group by
		1,2,3,4,5,6,7
),
inv_total as (
	select article,dc_code, sum(allocated_quantity_size) allocated_total, sum(net_available) inventory_available from final_inv 
	group by 1,2
)
,
final_result AS (
    SELECT
        article,
		launch_date,
        packs, 
		packs_allocated,
		loose_units_allocated,
        color,
        description,
		demand,
        demand_type,
        fi.size,
		pda.channel,
		stfs.Allocated_Quantity_size2 as allocated_quantity_size,
        store_code as store,
        dc_code,
        dbc."name" as dc,
        min,
        allocated_total,
        inventory_available,
        round(Original_APS :: numeric, 2) AS Original_APS,
        round(Forecast_APS :: numeric, 2) AS Forecast_APS,
        round(Target_WOS :: numeric, 2) AS Target_WOS,
        Count_Store_Size,
        round(Actual_WOS :: numeric, 2) AS Actual_WOS,
        allocated_quantity_size as strategy_table_final_size_backup,
        l0_name, l1_name, l2_name
    FROM
        strategy_table_final_overall 
        left join inv_total inv using (article)
        left join final_inv fi using (article, dc_code)
        left join pack_data_agg pda using (article, dc_code)
		left join "global".distribution_centres dbc using (dc_code)
left join strategy_table_final_size stfs using(article, size)  
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, l0_name, l1_name, l2_name
)
SELECT 
 ast."order", 
 fr.*
FROM final_result AS fr 
left join global.product_attributes_filter paf using (article, size)
left join inventory_smart.article_status_tag ast using (product_code, channel)

';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
