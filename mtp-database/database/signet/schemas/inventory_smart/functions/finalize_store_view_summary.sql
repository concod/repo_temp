--liquibase formatted sql
--changeset liquibase:finalize_store_view_summary runOnChange:true stripComments:false splitStatements:false context:context:MTP-33741 MTP-28352 labels:MTP-33741 MTP-28352
--comment: MTP-33741 MTP-28352 Fix for Auto-allocations partial flow is not working, created at time based on edit plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
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
 * 							$3 = Ignore Allocation Code
							$4 = article filter
							$5 = type
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
 * 
 * 
		begin;
		select * from inventory_smart.finalize_store_view_summary
		    ('my_cur',
		     '6_251_testallocmarch2818',
		    '');
		 FETCH ALL IN "my_cur";
		commit;
	
		
		INVENTORY CALCULATION LOGIC :-
		--------------------------
--1
---1 SKU - 1 SUB SKU - user did not select sub sku
 --   inventory = inventory of sku = inventory of sub sku

---2
---1 SKU - 1 SUB SKU - user  select sub sku
 --   inventory = inventory of sku = inventory of sub sku

--3
---1 SKU - Multiple sub sku - user select SKU
 --   inventory = inventory of sku = SUM of inventory of ALL SUB SKUS

--4
---1 SKU - Multiple SUB SKU - user select one SUB SKU
 --   inventory != inventory of sku
 --   inventory = inventory of sub sku selected by user only

--If sub_sku in results is empty, join based on product_code
-- If present, join based on 

 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare
	_query_combine text;
	_article_filter text;

    begin
	_article_filter := '';

	IF ($4 = '') IS FALSE THEN
			_article_filter := format('AND article IN (''%s'')', $4);
	else  _article_filter := $4;
	END IF;

	if ($5 = 'allocated')
	then
                _query_combine := '





----store summary

with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| REPLACE($2, 'edit_', '') ||'''
            ),
strategy_table as (
select
	a.*,
	name as dc_name
from
	(
	select
		paf.article,
		carfs.sub_sku,
		carfs.retail_size_cd as size,
		product_code,
		carfs.store,
		allocated_total,
		coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
		channel,
		JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
		trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs

	left join global.product_attributes_filter paf 
		on    paf.article = carfs.article 
--and carfs.retail_size_cd = paf.size --- not required in signet
			
	left join "global".store_attributes_filter saf 
          on    store_code = store

	WHERE carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code =  '''|| $2 ||''' '|| _article_filter ||'
    ) a
left join global.distribution_centres dcs on
	dc = dcs.dc_code:: text
where
        size = packid
)
--select * from strategy_table;
,
dc_inventory as (

select 
	article,
	am.product_code,
	size,
	store,
	am.channel,
	dc,
	dc_name,
	store_grade,
	allocated_total,
	packid,
	sum(sa.oh) as dc_available,
    array_agg(sub_sku) as sub_sku 

from
	strategy_table am
	
left join inventory_smart.sku_dc_available_units sa  
on
	am.product_code = sa.product_code
	and am.dc = sa.dc_code::text
	and (am.sub_sku = child_sku or (am.sub_sku = ''''))
	-- if sub sku is present in results table then we take sub sku inventory
	
group by 
	article,
	am.product_code,
	size,
	store,
	am.channel,
	dc,
	dc_name,
	store_grade,
	allocated_total,
	packid

)
--select * from dc_inventory;
,
current_allocation as (
	select
		dci.*,
		sum(drq.quantity) as user_reserved_qty
	from
		dc_inventory dci
	left join 
		inventory_smart.sku_dc_reserved_units drq
	on
		dci.product_code = drq.product_code
		and dci.dc = drq.dc_code::text
	group by 1,2,3,4,5,6,7,8,9,10,11,12
)
--select * from current_allocation;
,
other_allocations AS (-- do not need at store level, dc level is enough

select article as article2,
		product_code,
		size as size2,
		dc_code as dc2,
		sum(quantity) as allocated_reserve_qty

from inventory_smart.sku_dc_allocations sda 

where allocation_code not in ('''|| $2 ||''', '''|| $3||''')
group by
		article2,
		product_code,
		size2,
		dc2

),

inventory_cte as (
-- cannot join at article size store level, because what if the same article size was allocated to different store
-- article size dc store level is how the allocated qty will work
-- net available inventory is wrt sku only and dc, not related to store
select 
	ca.article,
	ca.size,
	ca.dc,
	ca.dc_name,
	ca.product_code,
	--ca.mapping_code,
	ca.store,
	ca.packid,
	ca.store_grade,
	--ca.reserve_qty--,
	coalesce(ca.dc_available, 0) as dc_available,
	COALESCE(oa.allocated_reserve_qty, 0) as allocated_reserve_qty,
	COALESCE(ca.allocated_total, 0) as allocated_total,
	COALESCE(ca.user_reserved_qty, 0) as user_reserve_qty
	
	--coalesce(ca.dc_available,0) - COALESCE(sum(oa.allocated_reserve_qty), 0) - COALESCE(ca.allocated_total, 0) - COALESCE(ca.reserve_qty, 0) as net_available
    from 
		current_allocation ca
	left join other_allocations oa 
	on 	CA.article = oa.article2
	and ca.size = oa.size2	 
    --and concat('''''''', ca.dc, '''''''') = oa.dc2 --and concat('''', ca.dc, '''') = oa.dc2
	and ca.dc = oa.dc2:: text
	 
)

--select * from inventory_cte;
,

---
base as (
select
	article,
	store,
	dc,
    dc_name,
	coalesce(store_grade, ''-'') as store_grade,
	SUM(allocated_total) as allocated_units,
	MAX(allocated_reserve_qty) as allocated_reserve_qty,
	MAX(user_reserve_qty) as user_reserve_qty,
	SUM(dc_available) as Inventory_base
	
from
	inventory_cte carfs
group by
	1,
	2,
	3,
	4,
    5
)

--select * from base;

,
inventory as (
select
	dc,
	SUM(inventory_article) as Inventory
from
	(
	select
		article,
		dc,
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
	COUNT(distinct (( case when allocated_units > 0 then store  end ))) as store_cnt
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
			dc,
			dc_name,
			SUM(allocated_units) as allocated_units_total,
            SUM(allocated_reserve_qty) as allocated_reserve_qty,
            SUM(user_reserve_qty) as user_reserve_qty
			
		from
			

        --base -- doing this for scenario where multiple article exists
                (
                   	select
						article,
						
						dc,
						dc_name,
						SUM(allocated_units) as allocated_units,
				        --max(Inventory_base) as Inventory_base,
				        MAX(allocated_reserve_qty) as allocated_reserve_qty,
				        MAX(user_reserve_qty) as user_reserve_qty
				        -- not a sum because inventory is at article size dc level only
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
			using(dc)
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
		store,
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
	case -- specific to CLIENT
		--when store_grade = ''B'' then 0
		--when store_grade = ''D'' then 1
		--when store_grade = ''C'' then 2
		--when store_grade = ''A'' then 3
		--when store_grade = ''AA'' then 4
		--when store_grade = ''AAA'' then 5
		--when store_grade = ''-'' then 6
		when store_grade = ''C+'' then 0
		when store_grade = ''C'' then 1
		when store_grade = ''B+'' then 2
		when store_grade = ''B'' then 3
		when store_grade = ''A+'' then 4
		when store_grade = ''A'' then 0
		when store_grade = ''-'' then 6
		else 6
	end as flag
from
	(
	select
		store_grade,
		SUM(allocated_units) as allocated_units, -- store grade level
		Count(distinct store) as stores,
		SUM(allocated_units) / COALESCE(Count(distinct store), 1) as average
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
)
            ,grade_final as (
                SELECT JSONB_OBJECT_AGG(store_grade, ROUND(grade_index::numeric, 2)) grade_index,
                       JSONB_OBJECT_AGG(store_grade, allocated_units) grade_allocated_units
                FROM (
                    SELECT a.*,
                           CASE WHEN b.average !=0 THEN COALESCE(a.average, 0) / COALESCE(b.average, 1) 
                                ELSE 0
                           END as grade_index
                    FROM grade_data a
                    CROSS JOIN grade_b b
                ) foo
            )
select
	dc as dc_code,
	allocated_units_total allocated_qty,
	inventory_available net_available,
	dc_name as dc,
	art_cnt,
	store_cnt,
	Round(style_depth :: numeric, 2) as style_depth,
	grade_index,
    grade_allocated_units
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
	9


-----


				';
	else
	              _query_combine := '
				  with created as (
         			select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         			WHERE plan_code = '''|| $2 ||'''
            )

				 ,strategy_table AS (
				    SELECT a.*, name as dc FROM (
				        SELECT article, store, inv_avai, allocated_total, coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
				        JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc2,
				        (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
				        trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid
				        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
				        WHERE carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code =  '''|| $2 ||''' '|| _article_filter ||'
				    ) a
				    left join global.distribution_centres dcs on
						dc2 = dcs.dc_code:: text
	
				),
				base AS (
				    SELECT
				        article,
				        store,
				        dc,
				        COALESCE(store_grade, ''-'') AS store_grade,
				        SUM(allocated_total) AS allocated_units,
				        SUM(pack_available_qty) AS Inventory_base
				    FROM strategy_table carfs
				    GROUP BY 1, 2, 3, 4
				),
				inventory AS (
				    SELECT dc, SUM(inventory_article) AS Inventory
				    FROM (
				        SELECT article, dc, MAX(inventory_base) AS inventory_article
				        FROM base
				        GROUP BY 1, 2
				    ) AS foo
				    GROUP BY 1
				),
				cnt_table AS (
				    SELECT 1 AS key1,
				           COUNT(DISTINCT article) AS art_cnt,
				           COUNT(DISTINCT store) AS store_cnt
				    FROM base
				    WHERE allocated_units > 0
				),
				first_table AS (
				    SELECT *
				    FROM (
				        SELECT a.*, b.inventory - a.allocated_units_total AS Inventory_available,
				        1 as key1
				        FROM (
				            SELECT dc, SUM(allocated_units) AS allocated_units_total
				            FROM base
				            WHERE allocated_units > 0
				            GROUP BY 1
				        ) AS a
				    LEFT JOIN inventory b using(dc)
				    ) b
				    JOIN cnt_table USING(key1)
				),
				second_table AS (
				    SELECT Avg(art_cnt) AS style_depth
				    FROM (
				        SELECT store, Count(DISTINCT article) AS art_cnt
				        FROM base
				        WHERE allocated_units > 0
				        GROUP BY 1
				    ) AS a
				),
				grade_data AS (
				    SELECT
				        *,
						case -- specific to CLIENT
							--when store_grade = ''B'' then 0
							--when store_grade = ''D'' then 1
							--when store_grade = ''C'' then 2
							--when store_grade = ''A'' then 3
							--when store_grade = ''AA'' then 4
							--when store_grade = ''AAA'' then 5
							--when store_grade = ''-'' then 6
							when store_grade = ''C+'' then 0
							when store_grade = ''C'' then 1
							when store_grade = ''B+'' then 2
							when store_grade = ''B'' then 3
							when store_grade = ''A+'' then 4
							when store_grade = ''A'' then 0
							when store_grade = ''-'' then 6
							else 6
						end as flag
				    FROM (
				        SELECT
				            store_grade,
				            SUM(allocated_units) AS allocated_units,
				            Count(DISTINCT store) AS stores,
				            SUM(allocated_units) / Count(DISTINCT store) AS average
				        FROM base
				        GROUP BY 1
				    ) AS a
				),
				grade_b AS (
				    SELECT *
				    FROM grade_data
				    WHERE flag = ( SELECT Min(flag) FROM grade_data WHERE allocated_units <> 0 )
				)
            ,grade_final as (
                SELECT JSONB_OBJECT_AGG(store_grade, ROUND(grade_index::numeric, 2)) grade_index,
                       JSONB_OBJECT_AGG(store_grade, allocated_units) grade_allocated_units
                FROM (
                    SELECT a.*,
                           CASE WHEN b.average !=0 THEN COALESCE(a.average, 0) / COALESCE(b.average, 1) 
                                ELSE 0
                           END as grade_index
                    FROM grade_data a
                    CROSS JOIN grade_b b
                ) foo
            )
				SELECT
	dc as dc_code,
	allocated_units_total allocated_qty,
	inventory_available net_available,
	dc,
	art_cnt,
	store_cnt,
	Round(style_depth :: numeric, 2) as style_depth,
	grade_index,
    grade_allocated_units
				FROM
				    first_table
				    CROSS JOIN second_table
				    CROSS JOIN grade_final
				GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9

				';
	end if;
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
