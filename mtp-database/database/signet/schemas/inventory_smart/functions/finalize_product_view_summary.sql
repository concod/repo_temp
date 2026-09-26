--liquibase formatted sql
--changeset liquibase:finalize_product_view_summary runOnChange:true stripComments:false splitStatements:false context:MTP-33741 MTP-28352 labels:MTP-33741 MTP-28352
--comment: MTP-33741 MTP-28352 Fix for Auto-allocations partial flow is not working, created at time based on edit plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
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
 * 							$3 = Ignore Allocation Code
                             $4 = article filter
                             $5 = type
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





----PRODUCT VIEW  summary


with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| REPLACE($2, 'edit_', '') ||'''
            )
			,base as (
select
	a.*,
	name as dc_name
from
	(
	-- article size store dc level
	select
		carfs.article,
		carfs.sub_sku,
		store,
		carfs.retail_size_cd as size,
		paf.product_code,
		"order" as size_order,
		JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
		channel,
		allocated_total,
		trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	left join global.product_attributes_filter paf on
			paf.article = carfs.article
			--- and paf.size = carfs.retail_size_cd -- Not required for signet
	left join "global".store_attributes_filter saf 
		on
		store_code = store
	where carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code = '''|| $2 ||''' '|| _article_filter ||'
    ) a
left join global.distribution_centres dcs on
	dc = dcs.dc_code:: text
where
	size = packid
)
--select * from base;
--,
--articles_mapping as (
--select
--	article,
--	size,
--	pmpd.product_code,
--	mapping_code,
--	store,
--	dc,
--	channel,
--	dc_name,
--	allocated_total,
--	packid,
--	size_order
--from
--	base b
--join "global".product_mapping_product_dc pmpd
--on
--	b.product_code = pmpd.product_code
--	and pmpd.dc_code::text = b.dc
--)
--select * from articles_mapping;
,

dc_calculation as (
select 
		st.article,
		st.size,
		st.product_code, 
		st.store,
		--st.channel,
		st.dc,
		st.dc_name, 
		st.packid,
		size_order,
		st.allocated_total,

        sum(sa.oh) as dc_available,
        array_agg(sub_sku) as sub_sku 
from
        base st
left join inventory_smart.sku_dc_available_units sa  
on
        st.product_code = sa.product_code
        and st.dc = sa.dc_code::text
       and (st.sub_sku = child_sku or (st.sub_sku = ''''))
     --   and st.channel = sa.channel
group by 		

		st.article,
		st.size,
		st.product_code, 
		st.store,
		--st.channel,
		st.dc,
		st.dc_name, 
		st.packid,
		size_order,
		st.allocated_total


)
--select * from dc_calculation;

,
current_allocation as (
 
	select
		dd.*,
		sum(drq.quantity) as user_reserved_qty
	from
		dc_calculation dd
	left join 
			inventory_smart.sku_dc_reserved_units drq
	on
		dd.product_code = drq.product_code
		and dd.dc = drq.dc_code::text
	group by 1,2,3,4,5,6,7,8,9,10,11
)
--select * from current_allocation;
, 
other_allocations as (

select article as article2,
		product_code,
		size as size2,
		dc_code as dc2,
		sum(quantity) as allocated_reserve_qty
from inventory_smart.sku_dc_allocations sda 

where allocation_code not in ('''|| $2 ||''', '''|| $3 ||''')
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
        ca.product_code,
       -- ca.mapping_code,
        ca.store,
        
        ca.packid,
        ca.size_order,
        ca.allocated_total,
        ca.dc_available,
        oa.allocated_reserve_qty,
        ca.user_reserved_qty
	
from 
		current_allocation ca
left join other_allocations oa
	--TODO revert later
	on
	CA.article = oa.article2
	and ca.size = oa.size2
	and  ca.dc = oa.dc2:: text
    -- channel TODO to be added

	 
)
--select * from inventory_cte;
,

first_table as (
--article count and store count
select
	count(distinct article) as art_cnt,
	count(distinct store) as store_cnt
from
	inventory_cte
where
	allocated_total > 0
),
second_table as (
--store average
select
	avg(store_count) as store_avg
from
	(
	select
		article,
		count(distinct store) as store_count
	from
		inventory_cte
	where
		allocated_total > 0
	group by
		1
    ) as a
),
third_table as (
select
	size,
	size_order,
	sum(allocated_total) as allocated_size
from
	inventory_cte
group by
	1,
	2
),
fourth_table_2 as (
select
	dc,
	name as dc_name,
	SUM(allocated_total) as allocated_qty,
	SUM(dc_available) as dc_available,
    SUM(allocated_reserve_qty) as allocated_reserve_qty,
    SUM(user_reserve_qty) as user_reserve_qty,
    coalesce(sum(dc_available),0) - coalesce(sum(allocated_reserve_qty), 0) - coalesce(sum(allocated_total), 0) - coalesce(sum(user_reserve_qty), 0) as net_available
	-- for all skus in dc
from
	(
	select
		article,
		size,
		dc,
		SUM(allocated_total) as allocated_total,
        max(dc_available) as dc_available,
        MAX(allocated_reserve_qty) as allocated_reserve_qty,
        MAX(user_reserved_qty) as user_reserve_qty
        -- not a sum because inventory is at article size dc level only
	from
		inventory_cte
	group by
		1,
		2,
		3
    ) as a
left join "global".distribution_centres dd on
	a.dc = dd.dc_code::text
group by
	1,
	2
)
select
	dc as dc_code,
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
	cross join third_table
	cross join fourth_table_2 
) a
order by
	size_order

-----


				';
	else
	_query_combine := '



------ VP product sumamry


with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| $2 ||'''
            )
	,base AS (
    SELECT * FROM (
        SELECT
            carfs.article,
            store,
            carfs.retail_size_cd AS size,
            "order" AS size_order,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            allocated_total AS allocated_units,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid,
            ((jsonb_array_elements_text(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int) AS inventory
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        WHERE carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code =  '''|| $2 ||'''
        GROUP BY 1, 2, 3, 4, 5, 6, 7,8
    ) a
    WHERE size = packid
),
first_table AS (
    SELECT count(DISTINCT article) AS art_cnt, count(DISTINCT store) AS store_cnt
    FROM base
    WHERE allocated_units > 0
),
second_table AS (
    SELECT avg(store_count) as store_avg
    FROM (
        SELECT article, count(DISTINCT store) AS store_count
        FROM base
        WHERE allocated_units > 0
        GROUP BY 1
    ) AS a
),
third_table AS (
    SELECT size, size_order, sum(allocated_units) AS allocated_size
    FROM base
    GROUP BY 1, 2
),
fourth_table AS (
    SELECT
        sum(allocated_units) AS allocated_qty,
        (sum(inventory) - sum(allocated_units)) AS non_allocated_qty
    FROM (
        SELECT
            article,
            size,
            sum(allocated_units) AS allocated_units,
            max(inventory) AS inventory
        FROM base
        GROUP BY 1, 2
    ) AS a
),
fourth_table_2 AS (
    SELECT dc as dc_code,
    		name as dc,
           SUM(allocated_units) AS allocated_qty,
           (SUM(inventory) - SUM(allocated_units)) AS net_dc_available
    FROM (
        SELECT
            article,
            size,dc,
            SUM(allocated_units) AS allocated_units,
            MAX(inventory) AS inventory
        FROM base
        GROUP BY 1, 2, 3
    ) AS a
    left join global.distribution_centres dcs on
	dc = dcs.dc_code:: text
    GROUP BY 1,2
)
SELECT dc, dc_code, art_cnt, store_cnt, store_avg, size, size_order, allocated_size,
       b.allocated_qty, b.net_dc_available, allocation_perc
FROM (
    SELECT
        *,
        CASE
            WHEN allocated_qty = 0 THEN 0
            ELSE allocated_size / allocated_qty
        END AS allocation_perc
    FROM first_table
    CROSS JOIN second_table
    CROSS JOIN third_table
    CROSS JOIN fourth_table
) a
CROSS JOIN fourth_table_2 b
ORDER BY size_order
-----
				';
	end if;
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
