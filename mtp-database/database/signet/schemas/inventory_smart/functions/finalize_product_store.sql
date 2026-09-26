--liquibase formatted sql
--changeset liquibase:finalize_product_store runOnChange:true stripComments:false splitStatements:false context:MTP-25016 labels:MTP-24654
--comment: MTP-24654-7,created at time based on edit plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store(input refcursor, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.finalize_product_store
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 							$3 = Store code
 * 							$4 = Article code/SKU code
 * 							$5 = Ignore Allocation Code
								$6 = type
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	
	begin;
	select * from inventory_smart.finalize_product_store
	    ('my_cur',
	     '6_251_testallocmarch2818',
	    '',
	   '20302594',
	  '');
	 FETCH ALL IN "my_cur";
	commit;

 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare
	_query_combine text;
	_store_filter1 text;
	_store_filter2 text;
	_article_filter text;

    begin
	    _store_filter1 := '';
	   _article_filter := '';
	   _store_filter2 := '';

		if ($3 = '') IS FALSE
			then
				_store_filter1 := ' WHERE store_code = '''||$3||''' ' ;
				_store_filter2 := ' WHERE a.store_code = '''||$3||''' ' ;
			end if;
		if ($4 = '') IS FALSE
			then
				_article_filter := ' AND carfs.article = '''||$4||''' ' ;
			end if;
		
		if ($6 = 'allocated')	
		then
	                _query_combine := '


------  product store view



with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| REPLACE($2, 'edit_', '') ||'''
            )            
,strategy_table as (
select  
	a.*,
	name as dc_name
from
	(
	select
		carfs.article,
		carfs.sub_sku,
		carfs."style" as style,
		carfs.style_description as description,
		carfs.color,
		carfs.color_code,
		trim("retail_size_cd") as size,
		paf.product_code,
        paf.store_pack_size,
		channel,
		--("inv_avai") as Inv_Avai,
		trim("store") as store_code,
		("demand") as Demand,
		constrained_forecast,
		("ros") as ROS,
		("oh") as OH,
		("oo") as OO,
		("it") as IT,
        ("lt_forecast") AS lt_forecast,
        updated_oh_oo_it,
		("oh_oo_intransit") as OH_OO_InTransit,
		("wos") as WOS,
		("allocated_total") as Allocated_Total,
	--	trim(allocation_code) as allocation_code,
		("allocated_total" + "oh_oo_intransit") / nullif("ros", 0) as Current_WOS,
		aps,
		min,
		max,
		split_profile,
		saf.store_name,
		carfs.store_grade,
        carfs.original_forecast,
		pack_dc_allocation,
		case
			when demand_type = ''IA'' then ''IA Forecast''
			else demand_type
		end as demand_type,
		JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
		trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid,
		(JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
		case
			when updated_oh_oo_it >= min then 0
			else MIN - (updated_oh_oo_it)
		end as min_short,
		case
			when allocated_total >=
			(case
				when updated_oh_oo_it >= min then 0
				else MIN - (updated_oh_oo_it)
			end) 
                    then
			(case
				when updated_oh_oo_it >= min then 0
				else MIN - (updated_oh_oo_it)
			end)
			else allocated_total
		end as min_allocation,
		case
			when allocated_total >=
			(case
				when updated_oh_oo_it >= min then 0
				else MIN - (updated_oh_oo_it)
			end) 
                    then allocated_total -
			(case
				when updated_oh_oo_it >= min then 0
				else MIN - (updated_oh_oo_it)
			end)
			else allocated_total - allocated_total
		end as wos_allocation
	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	left join global.product_attributes_filter paf on
			paf.article = carfs.article
		-- and carfs.retail_size_cd = paf.size --not required for signet
	left join "global".store_attributes_filter saf 
	        on
		store_code = store
	where carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
        and allocation_code = '''|| $2 ||'''   ' || _article_filter || '

    ) a
left join global.distribution_centres dcs on
	dc = dcs.dc_code:: text
where
	size = packid
)
--select * from strategy_table;
,
Article_det AS (
    SELECT article, COUNT(DISTINCT size) AS size_count
    FROM strategy_table
    GROUP BY 1
),
aps_split AS (
    SELECT article, store_code, APS_Artlvl * str_cnt * split_profile AS aps_upd
    FROM (
        SELECT article, store_code, split_profile
        FROM strategy_table
        GROUP BY 1, 2, 3
    ) AS a
    JOIN (
        SELECT article, AVG(APS_Artlvl) AS APS_Artlvl, COUNT(DISTINCT store_code) AS str_cnt
        FROM (
            SELECT article, store_code, SUM(aps) AS APS_Artlvl
            FROM strategy_table
            GROUP BY 1, 2
        ) AS b
        GROUP BY 1
    ) AS c
    USING(article)
),
strategy_table_2 AS (
    SELECT * FROM strategy_table
    JOIN aps_split USING(article, store_code)
),
pack_data AS (
    SELECT store_code, dc,
        STRING_AGG(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_id else null end, '','') as packs,
        COALESCE(SUM(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS packs_allocated,
        COALESCE(SUM(CASE WHEN pack_id NOT LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS loose_units_allocated
    FROM (
        SELECT article,
               store_code,dc,
               TRIM( BOTH ''""'' FROM (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated''))::character varying) AS pack_id,
               (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
        FROM (
            SELECT article,
                   store_code,
                   JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
                   pack_dc_allocation
            FROM strategy_table
            GROUP BY 1, 2, 3, 4
        ) AS foo
        GROUP BY 1, 2, 3, 4,5
    ) AS b
    GROUP BY 1,2
),
allocated_dc AS (
    SELECT store_code, dc, SUM(allocated_total) as allocated_total_dc
    FROM strategy_table a
     ' || _store_filter1 || '
    GROUP BY 1, 2
),
strategy_table_final_overall AS (
    SELECT
        store_code,
        store_name,
        store_grade,
        store_pack_size,
        demand_type,
        original_forecast,
        sum(demand) AS Demand,
		sum(constrained_forecast) as constrained_forecast,
        sum(min) AS Min,
		sum(max) AS Max,
        sum(Allocated_Total) AS Allocated_Quantity,
        SUM(min_allocation) AS min_allocation,
        SUM(wos_allocation) AS wos_allocation,
        avg(aps_upd) AS Original_APS,
        sum(ROS) AS Forecast_APS,
        sum(OH) AS OH,
        sum(OO) AS OO,
        sum(IT) AS IT,
        sum(lt_forecast) AS lt_forecast,
        sum(updated_oh_oo_it) AS updated_oh_oo_it,
        SUM(OH_OO_InTransit) AS OH_OO_InTransit,
        sum(Demand * WOS) / nullif(sum(Demand), 0) AS Target_WOS,
        sum(Demand * Current_WOS) / nullif(sum(Demand), 0) AS Actual_WOS,
        ( ( COUNT (distinct ( CASE WHEN OH_OO_InTransit + Allocated_Total > 0 THEN size
                    END
        ) ) ) :: float8 / max(size_count) :: float8
        ) AS size_integrity
    FROM strategy_table_2
    LEFT JOIN Article_det AS artdet USING(article)
    GROUP BY 1, 2, 3, 4, 5, 6
),

------
--select * from strategy_table;
 
dc_calculation as (
select 
		st.article, 
		 st."style", 
		 st.description, 
		 st.color, 
		 st.color_code, 
		 st."size", 
		 st.product_code, 
		 st.channel, 
		 st.store_code, 
		 st.demand, 
		 st.constrained_forecast,
		 st.ros, 
		 st.oh, 
		 st.oo, 
		 st.it, 
		 st.oh_oo_intransit, 
		 st.wos, 
		 st.allocated_total, 
		 st.current_wos, 
		 st.aps, 
		 st.min, 
         st.lt_forecast,
         st.updated_oh_oo_it,
		 st.split_profile, 
		 st.store_name, 
		 st.store_grade, 
		 st.pack_dc_allocation, 
		 st.demand_type, 
		 st.dc, 
		 st.packid, 
		 st.pack_available_qty, 
		 st.min_short, 
		 st.min_allocation, 
		 st.wos_allocation, 
		 st.dc_name,

	    sum(sa.oh) as dc_available,
        array_agg(sub_sku) as sub_sku 
from
        strategy_table_2 st
left join inventory_smart.sku_dc_available_units sa  
on
        st.product_code = sa.product_code
        and st.dc = sa.dc_code::text
       and (st.sub_sku = child_sku or (st.sub_sku = ''''))

group by 		
		st.article, 
		 st."style", 
		 st.description, 
		 st.color, 
		 st.color_code, 
		 st."size", 
		 st.product_code, 
		 st.channel, 
		 st.store_code, 
		 st.demand, 
		 st.constrained_forecast,
		 st.ros, 
		 st.oh, 
		 st.oo, 
		 st.it, 
		 st.oh_oo_intransit, 
		 st.wos, 
		 st.allocated_total, 
		 st.current_wos, 
		 st.aps, 
		 st.min, 
         st.lt_forecast,
         st.updated_oh_oo_it,
		 st.split_profile, 
		 st.store_name, 
		 st.store_grade, 
		 st.pack_dc_allocation, 
		 st.demand_type, 
		 st.dc, 
		 st.packid, 
		 st.pack_available_qty, 
		 st.min_short, 
		 st.min_allocation, 
		 st.wos_allocation, 
		 st.dc_name

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
		-- and dd.channel = drq.channel 
	group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37

)
, 
other_allocations as (

select article as article2,
		product_code as product_code2,
		size as size2,
		dc_code as dc2,
		sum(quantity) as allocated_reserve_qty
from inventory_smart.sku_dc_allocations sda 

where allocation_code not in ('''|| $2 ||''', '''|| $5 ||''')
group by
		article2,
		product_code2,
		size2,
		dc2

)
--select * from other_allocations;
,


inventory_cte as (
-- cannot join at article size store level, because what if the same article size was allocated to different store
-- article size dc store level is how the allocated qty will work
-- net available inventory is wrt sku only and dc, not related to store
select 

		 ca.article, 
		 ca.sub_sku, 
		 ca."style", 
		 ca.description, 
		 ca.color, 
		 ca.color_code, 
		 ca."size", 
		 ca.product_code, 
		 ca.channel, 
		 ca.store_code, 
		 ca.demand, 
		 ca.constrained_forecast,
		 ca.ros, 
		 ca.oh, 
		 ca.oo, 
		 ca.it, 
		 ca.oh_oo_intransit, 
		 ca.wos, 
		 ca.current_wos, 
		 ca.aps, 
		 ca.min, 
         ca.lt_forecast,
         ca.updated_oh_oo_it,
		 ca.split_profile, 
		 ca.store_name, 
		 ca.store_grade, 
		 ca.pack_dc_allocation, 
		 ca.demand_type, 
		 ca.dc, 
		 ca.packid, 
		 ca.pack_available_qty, 
		 ca.min_short, 
		 ca.min_allocation, 
		 ca.wos_allocation, 
		 ca.dc_name, 
		 ca.sub_sku,
	

	coalesce(ca.allocated_total, 0) as allocated_total,
	coalesce(ca.dc_available, 0) as dc_available,
	coalesce(oa.allocated_reserve_qty, 0) as allocated_reserve_qty,
	coalesce(ca.user_reserved_qty, 0) as user_reserved_qty

	--avg(coalesce(ca.dc_available, 0)) - coalesce(sum(oa.allocated_reserve_qty), 0) - max(coalesce(ca.allocated_total, 0)) - coalesce(sum(ca.user_reserved_qty), 0) as net_available
from
	current_allocation ca
left join other_allocations oa
        on
	CA.article = oa.article2
	--and ca.size = oa.size2
	and  ca.dc = oa.dc2:: text
    
)
--select * from inventory_cte;

,
DC_Avai_Art AS (
    SELECT
        article,
        dc,
        dc_name, 
        SUM(allocated_total) as Allocated_Total_art,
        SUM(dc_available) as dc_available,
        SUM(allocated_reserve_qty) as allocated_reserve_qty,
        SUM(user_reserved_qty) as user_reserved_qty,
        coalesce(sum(dc_available),0) - coalesce(sum(allocated_reserve_qty), 0) - coalesce(sum(allocated_total), 0) - coalesce(sum(user_reserved_qty), 0) as DC_Available_art --net_available
    FROM (
        SELECT
            article, 
            dc,
            dc_name,
            size AS Size,
            SUM(allocated_total) as allocated_total,
            max(dc_available) as dc_available,
            MAX(allocated_reserve_qty) as allocated_reserve_qty,
            MAX(user_reserved_qty) as user_reserved_qty
                -- not a sum because inventory is at article size dc level only
        FROM inventory_cte
        GROUP BY 1, 2, 3, 4
    ) AS a
    GROUP BY 1, 2, 3
)
--select * from DC_Avai_Art;
,


DC_Avai_Art_Size AS (
    SELECT
        article,
        size AS Size,
        --avg(dc_available) AS DC_Available_size,
        coalesce(sum(dc_available),0) - coalesce(sum(allocated_reserve_qty), 0) - coalesce(sum(allocated_total), 0) - coalesce(sum(user_reserved_qty), 0) as DC_Available_size ,--net_available
        sum(Allocated_Total) AS Total_Allocated_size
        FROM (
        SELECT
            article, 
            dc,
            dc_name,
            size AS Size,
            SUM(allocated_total) as allocated_total,
            max(dc_available) as dc_available,
            MAX(allocated_reserve_qty) as allocated_reserve_qty,
            MAX(user_reserved_qty) as user_reserved_qty
                -- not a sum because inventory is at article size dc level only
        FROM inventory_cte
        GROUP BY 1, 2, 3, 4
    ) AS a
    GROUP BY 1, 2
)
--select * from DC_Avai_Art_Size;
,
Store_Size_Cnt AS (
    SELECT article, count(DISTINCT Store_size) AS Count_Store_Size
    FROM (
        SELECT article, concat(store_code, size) AS Store_size
        FROM inventory_cte
        GROUP BY 1, 2
    ) AS a
    GROUP BY 1
),
strategy_table_final_total AS (
    SELECT store_code, a.dc, Allocated_Total_art, DC_Available_art
    FROM inventory_cte AS a
    JOIN DC_Avai_Art AS b ON a.article = b.article and a.dc= b.dc
    GROUP BY 1, 2, 3, 4
),
strategy_table_final_size AS (
    SELECT * From strategy_table_final_total
    JOIN (
        SELECT
            store_code,
            a.size AS Size,
            DC_Available_size,
            Total_Allocated_size,
            Count_Store_Size,
            SUM(demand) AS Demand_size,
			sum(constrained_forecast) as constrained_forecast,
            sum(Allocated_Total)::int AS Allocated_Quantity_size,
            sum(OH) AS OH_size,
            sum(OO) AS OO_size,
            sum(IT) AS IT_size,
            sum(lt_forecast) AS lt_forecast_size,
            SUM(updated_oh_oo_it) AS updated_oh_oo_it_size
        FROM inventory_cte AS a
        JOIN DC_Avai_Art_Size AS c ON a.article = c.article
        AND a.size = c.size
        JOIN Store_Size_Cnt AS d ON a.article = d.article
        GROUP BY 1, 2, 3, 4, 5
    ) b USING(store_code)
),
final_result AS (
    SELECT
        name as dc,
'''|| $4 ||''' as article,
        pd.dc as dc_code,
        a.store_code,
        smf.store_name,
        coalesce (store_grade, ''-'') as store_grade,
        --climate,
        --country,
        demand_type,
        b.size,
        Min as min_constraint,
		a.Max,
        pd.packs,
        pd.packs_allocated packs_allocated_qty,
        pd.loose_units_allocated,
        a.original_forecast,
        a.Demand as demand,
		a.constrained_forecast,
        a.store_pack_size,
        allocated_total_dc AS Allocated_Quantity,
        (DC_Available_art) AS net_available,
        min_allocation AS min_allocation_size,
        wos_allocation AS wos_allocation_size,
        round(Original_APS :: numeric, 2) AS Original_APS,
        round(Forecast_APS :: numeric, 2) AS Forecast_APS,
        OH,
        OO,
        IT,
        lt_forecast,
        updated_oh_oo_it,
        round(Target_WOS :: numeric, 2) AS Target_WOS,
        round(Actual_WOS :: numeric, 2) AS Actual_WOS,
        Demand_size,
        allocated_quantity_size,
        OH_size,
        OO_size,
        IT_size,
        updated_oh_oo_it_size,
        (DC_Available_size ) AS DC_Available_size_final,
        round(size_integrity :: numeric * 100, 2) AS size_integrity
    FROM strategy_table_final_overall AS a
    LEFT JOIN strategy_table_final_size AS b ON a.store_code = b.store_code
    LEFT JOIN pack_data pd ON a.store_code = pd.store_code
    LEFT JOIN "global".store_master smf ON a.store_code = smf.store_code
    JOIN allocated_dc as adc on a.store_code = adc.store_code AND b.dc = adc.dc
    LEFT JOIN global.distribution_centres dcs ON b.dc = dcs.dc_code:: text
    ' || _store_filter2 || '
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38
)
,dc_available as (
    SELECT dc_code,
           JSON_OBJECT_AGG(size, net_available) eaches_available,
 	       ''{}''::JSON packs_available
    FROM final_result
    GROUP BY 1
)
--,
--level_data AS (
--    SELECT size_mapping_classification, pmf.size
--    FROM global.product_attributes_filter AS pmf
--    JOIN strategy_table AS st ON st.article :: text = pmf.article
--   GROUP BY size_mapping_classification, pmf.size
--),
--order_data AS (
--    SELECT smt.size, "order"
--    FROM inventory_smart.size_mapping AS smt
--    JOIN level_data AS Ft ON Ft.size_mapping_classification = smt.size_mapping_classification AND Ft.size = smt.size
-- )
SELECT final_result.*, 1 as order,
       da.eaches_available,
       da.packs_available
FROM final_result
LEFT JOIN dc_available da using(dc_code)
--JOIN order_data ON final_result.size = order_data.size
--ORDER BY order_data.order


-----


				';
		else
       _query_combine := '




------ VP product store view


with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| $2 ||'''
            ),
  strategy_table AS (
    SELECT * FROM (
        SELECT
            article,
            "style" AS style,
            style_description AS description,
            color,
            color_code,
            trim("retail_size_cd") AS size,
            ("inv_avai") AS Inv_Avai,
            trim("store") AS store_code,
            sps.store_pack_size,
            ("demand") AS Demand,
			constrained_forecast,
            ("ros") AS ROS,
            ("oh") AS OH,
            ("oo") AS OO,
            ("it") AS IT,
            ("lt_forecast") AS lt_forecast,
            updated_oh_oo_it,
            ("oh_oo_intransit") AS OH_OO_InTransit,
            ("wos") AS WOS,
            ("allocated_total") AS Allocated_Total,
            trim(allocation_code) AS allocation_code,
            ("allocated_total" + "oh_oo_intransit") / nullif("ros", 0) AS Current_WOS,
            aps,
            min,
			max,
            split_profile,
            store_name,
            store_grade,
            original_forecast,
            pack_dc_allocation,
            CASE WHEN demand_type = ''IA'' then  ''IA Forecast'' ELSE demand_type END AS demand_type,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) As packid,
            (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
            CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END as min_short,
                CASE WHEN allocated_total >= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
                    THEN (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) ELSE allocated_total END as min_allocation,
                CASE WHEN allocated_total>= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
                    THEN allocated_total - (case when updated_oh_oo_it >= min then 0 else MIN - (updated_oh_oo_it) END) ELSE allocated_total - allocated_total END as wos_allocation
         FROM inventory_smart.create_allocation_result_flat_gurobi carfs left join
        (select article, store_pack_size from global.product_attributes_filter paf group by 1,2) sps using (article)
        WHERE carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code = '''|| $2 ||'''   ' || _article_filter || '
    ) a
    WHERE size = packid
),
Article_det AS (
    SELECT article, COUNT(DISTINCT size) AS size_count
    FROM strategy_table
    GROUP BY 1
),
aps_split AS (
    SELECT article, store_code, APS_Artlvl * str_cnt * split_profile AS aps_upd
    FROM (
        SELECT article, store_code, split_profile
        FROM strategy_table
        GROUP BY 1, 2, 3
    ) AS a
    JOIN (
        SELECT article, AVG(APS_Artlvl) AS APS_Artlvl, COUNT(DISTINCT store_code) AS str_cnt
        FROM (
            SELECT article, store_code, SUM(aps) AS APS_Artlvl
            FROM strategy_table
            GROUP BY 1, 2
        ) AS b
        GROUP BY 1
    ) AS c
    USING(article)
),
strategy_table_2 AS (
    SELECT * FROM strategy_table
    JOIN aps_split USING(article, store_code)
),
pack_data AS (
    SELECT store_code, dc,
        STRING_AGG(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_id else null end, '','') as packs,
        COALESCE(SUM(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS packs_allocated,
        COALESCE(SUM(CASE WHEN pack_id NOT LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS loose_units_allocated
    FROM (
        SELECT article,
               store_code,dc,
               TRIM( BOTH ''""'' FROM (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated''))::character varying) AS pack_id,
               (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
        FROM (
            SELECT article,
                   store_code,
                   JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
                   pack_dc_allocation
            FROM strategy_table
            GROUP BY 1, 2, 3, 4
        ) AS foo
        GROUP BY 1, 2, 3, 4,5
    ) AS b
    GROUP BY 1,2
),
allocated_dc AS (
    SELECT store_code, dc, SUM(allocated_total) as allocated_total_dc
    FROM strategy_table a
     ' || _store_filter1 || '
    GROUP BY 1, 2
),
strategy_table_final_overall AS (
    SELECT
        store_code,
        store_name,
        store_grade,
        demand_type,
        original_forecast,
        store_pack_size,
        sum(demand) AS Demand,
		sum(constrained_forecast) as constrained_forecast,
        sum(min) AS Min,
		sum(max) AS Max,
        sum(Allocated_Total) AS Allocated_Quantity,
        SUM(min_allocation) AS min_allocation,
        SUM(wos_allocation) AS wos_allocation,
        avg(aps_upd) AS Original_APS,
        sum(ROS) AS Forecast_APS,
        sum(OH) AS OH,
        sum(OO) AS OO,
        sum(IT) AS IT,
        sum(lt_forecast) AS lt_forecast,
        sum(updated_oh_oo_it) as updated_oh_oo_it,
        SUM(OH_OO_InTransit) AS OH_OO_InTransit,
        sum(Demand * WOS) / nullif(sum(Demand), 0) AS Target_WOS,
        sum(Demand * Current_WOS) / nullif(sum(Demand), 0) AS Actual_WOS,
        ( ( COUNT (distinct ( CASE WHEN OH_OO_InTransit + Allocated_Total > 0 THEN size
                    END
        ) ) ) :: float8 / max(size_count) :: float8
        ) AS size_integrity
    FROM strategy_table_2
    LEFT JOIN Article_det AS artdet USING(article)
    GROUP BY 1, 2, 3, 4, 5, 6
),
DC_Avai_Art AS (
    SELECT
        article,
        dc,
        sum(DC_Available_art) AS DC_Available_art,
        sum(Allocated_Total_art) AS Allocated_Total_art
    FROM (
        SELECT
            article, dc,
            size AS Size,
            avg(pack_available_qty) AS DC_Available_art,
            sum(Allocated_Total) AS Allocated_Total_art
        FROM strategy_table
        GROUP BY 1, 2, 3
    ) AS a
    GROUP BY 1, 2
),
DC_Avai_Art_Size AS (
    SELECT
        article,
        size AS Size,
        avg(Inv_Avai) AS DC_Available_size,
        sum(Allocated_Total) AS Total_Allocated_size
    FROM strategy_table
    GROUP BY 1, 2
),
Store_Size_Cnt AS (
    SELECT article, count(DISTINCT Store_size) AS Count_Store_Size
    FROM (
        SELECT article, concat(store_code, size) AS Store_size
        FROM strategy_table
        GROUP BY 1, 2
    ) AS a
    GROUP BY 1
),
strategy_table_final_total AS (
    SELECT store_code, a.dc, Allocated_Total_art, DC_Available_art
    FROM strategy_table AS a
    JOIN DC_Avai_Art AS b ON a.article = b.article and a.dc= b.dc
    GROUP BY 1, 2, 3, 4
),
strategy_table_final_size AS (
    SELECT * From strategy_table_final_total
    JOIN (
        SELECT
            store_code,
            a.size AS Size,
            DC_Available_size,
            Total_Allocated_size,
            Count_Store_Size,
            SUM(demand) AS Demand_size,
            sum(Allocated_Total)::int AS Allocated_Quantity_size,
            sum(OH) AS OH_size,
            sum(OO) AS OO_size,
            sum(IT) AS IT_size,
            sum(lt_forecast) AS lt_forecast_size,
            sum(updated_oh_oo_it) as updated_oh_oo_it_size
        FROM strategy_table AS a
        JOIN DC_Avai_Art_Size AS c ON a.article = c.article
        AND a.size = c.size
        JOIN Store_Size_Cnt AS d ON a.article = d.article
        GROUP BY 1, 2, 3, 4, 5
    ) b USING(store_code)
),
final_result AS (
    SELECT
        dcs.name as dc,
        pd.dc as dc_code,
        a.store_code,
        smf.store_name,
        store_grade,
        --climate,
        --country,
        demand_type,
		constrained_forecast,
        a.original_forecast,
        a.Demand as demand,
        b.size,
        Min as min_constraint,
		Max,
        pd.packs,
        pd.packs_allocated packs_allocated_qty,
        pd.loose_units_allocated,
        a.store_pack_size,
        allocated_total_dc AS Allocated_Quantity,
        (DC_Available_art - Allocated_Total_art) AS DC_Avai_Art,
        min_allocation AS min_allocation_size,
        wos_allocation AS wos_allocation_size,
        round(Original_APS :: numeric, 2) AS Original_APS,
        round(Forecast_APS :: numeric, 2) AS Forecast_APS,
        OH,
        OO,
        IT,
        lt_forecast,
        updated_oh_oo_it,
        round(Target_WOS :: numeric, 2) AS Target_WOS,
        round(Actual_WOS :: numeric, 2) AS Actual_WOS,
        Demand_size,
        allocated_quantity_size,
        OH_size,
        OO_size,
        IT_size,
        updated_oh_oo_it_size,
        (DC_Available_size - Total_Allocated_size) AS net_available,
        round(size_integrity :: numeric * 100, 2) AS size_integrity
    FROM strategy_table_final_overall AS a
    LEFT JOIN strategy_table_final_size AS b ON a.store_code = b.store_code
    LEFT JOIN pack_data pd ON a.store_code = pd.store_code
    LEFT JOIN "global".store_master smf ON a.store_code = smf.store_code
    JOIN allocated_dc as adc on a.store_code = adc.store_code AND b.dc = adc.dc
    LEFT JOIN (select store_code, store_name from "global".store_master ) smf2 ON pd.dc = smf2.store_code
    
left join global.distribution_centres dcs on
	pd.dc = dcs.dc_code:: text
' || _store_filter2 || '
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37
)--,
,dc_available as (
    SELECT dc_code,
           JSON_OBJECT_AGG(size, net_available) eaches_available,
 	       ''{}''::JSON packs_available
    FROM final_result
    GROUP BY 1
)
--level_data AS (
--    SELECT size_mapping_classification, pmf.size
 --   FROM global.product_attributes_filter AS pmf
--    JOIN strategy_table AS st ON st.article :: text = pmf.article
--   GROUP BY size_mapping_classification, pmf.size
--),
--order_data AS (
--    SELECT smt.size, "order"
 --   FROM inventory_smart.size_mapping AS smt
 --   JOIN level_data AS Ft ON Ft.size_mapping_classification = smt.size_mapping_classification AND Ft.size = smt.size
 --)
SELECT final_result.*, 1 as order,
       da.eaches_available,
       da.packs_available
FROM final_result
LEFT JOIN dc_available da using(dc_code)
--JOIN order_data ON final_result.size = order_data.size
--ORDER BY order_data.order

-----

				';
		end if;
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
