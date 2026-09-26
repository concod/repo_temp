--liquibase formatted sql
--changeset liquibase:finalize_store_view runOnChange:true stripComments:false splitStatements:false context:MTP-56390 MTP-59831 labels:MTP-56390 MTP-59831
--comment: MTP-56390 MTP-59831 Fix for fetching original available qty in store view.,created at time based on edit plan, MTP-111256 use max for store name and string agg store grade - fix syntax
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(input refcursor, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
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
                            $3 = Ignore allocation code
                            $4 = article filter
							$5 = type

 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
     	begin;
		select * from inventory_smart.finalize_store_view
		    ('my_cur',
		     '3_aignet_test_allocation_1');
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




------ STORE VIEW TABLE DATA



--store view
with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| REPLACE($2, 'edit_', '') ||'''
            )
,dc_data as (
select
	store,
	TRIM( both '''' from unnest(dc_codes)::varchar) as dc_codes,
	"source"
from
	inventory_smart.create_allocation_result_flat_gurobi carfg
WHERE carfg.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
         and allocation_code =  '''|| $2 ||''' '|| _article_filter ||' 
group by
	1,
	2,
	3
)
--select * from dc_data
,

strategy_table as (
select 
	a.*,
	name as dc_name
from
	(
	select
		carfs.article,
		---
		carfs.style as style,
		paf.product_code,
		style_description as description,
		carfs.color,
		carfs.color_code,
		trim("retail_size_cd") as size,
		---
		channel,
		--("inv_avai") AS Inv_Avai,
		trim("store") as store,
		("demand") as Demand,
		("ros") as ROS,
		("oh") as OH,
		("oo") as OO,
		("it") as IT,
		("lt_forecast") AS lt_forecast,
		("oh_oo_intransit") as OH_OO_InTransit,
		("wos") as WOS,
		("allocated_total") as Allocated_Total,
		trim(allocation_code) as allocation_code,
		("allocated_total" + "oh_oo_intransit") / nullif("ros", 0) as Current_WOS,
		aps,
		min,
		max,
		split_profile,
		saf.store_name,
		--saf.store_grade, --TODO REVIEW
		coalesce(NULLIF(TRIM(carfs.store_grade),''''), '''') as store_grade,
		pack_dc_allocation,
		JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
		---
		trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid,
		--		    (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,		
        CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END as min_short,
        CASE WHEN allocated_total >= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
            THEN (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) ELSE allocated_total END as min_allocation,
        CASE WHEN allocated_total>= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
            THEN allocated_total - (case when updated_oh_oo_it >= min then 0 else MIN - (updated_oh_oo_it) END) ELSE allocated_total - allocated_total END as wos_allocation

	from
		inventory_smart.create_allocation_result_flat_gurobi carfs
	left join global.product_attributes_filter paf on
			paf.article = carfs.article
		--and carfs.retail_size_cd = paf.size  --not required signet
	left join "global".store_attributes_filter saf 
	        on
		store_code = store
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
aps_split as (
select
	article,
	store,
	APS_Artlvl * str_cnt * split_profile as aps_upd
from
	(
	select
		article,
		store,
		split_profile
	from
		strategy_table
	group by
		1,
		2,
		3
    ) as a
join (
	select
		article,
		AVG(APS_Artlvl) as APS_Artlvl,
		COUNT(distinct store) as str_cnt
	from
		(
		select
			article,
			store,
			SUM(aps) as APS_Artlvl
		from
			strategy_table
		group by
			1,
			2
        ) as b
	group by
		1
    ) as c
		using(article)
),
strategy_table_2 as (
select
	*
from
	strategy_table
join aps_split
		using(article,
	store)
),
APS_table as (
select
	store,
	SUM(Demand_Art * APS_Art) / nullif(SUM(Demand_Art), 0) as Original_APS,
	SUM(Demand_Art * ROS_Art) / nullif(SUM(Demand_Art), 0) as Forecast_APS
from
	(
	select
		article,
		store,
		SUM(ROS) as ROS_Art,
		AVG(aps_upd) as APS_Art,
		SUM(Demand) as Demand_Art
	from
		strategy_table_2
	group by
		1,
		2
    ) a
group by
	1
),
pack_data as (
select
	store,
	dc,
	coalesce(SUM(case when pack_id like ''PPACK%'' then pack_allocated_qty end), 0) as packs_allocated,
	coalesce(SUM(case when pack_id not like ''PPACK%'' then pack_allocated_qty end), 0) as loose_units_allocated
from
	(
	select
		article,
		store,
		dc,
		TRIM( both ''""'' from (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated''))::character varying) as pack_id,
		(JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
	from
		(
		select
			article,
			store,
			JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
			pack_dc_allocation
		from
			strategy_table
		group by
			1,
			2,
			3,
			4
        ) as foo
	group by
		1,
		2,
		3,
		4,
		5
    ) as b
group by
	1,
	2
),

allocated_dc as (
select
	store,
	dc,
	SUM(allocated_total) as allocated_total_dc
from
	strategy_table_2
group by
	1,
	2
),
strategy_table_final as (
select
	store as Store,
	Original_APS,
	Forecast_APS,
	MAX(store_name) AS store_name,
	STRING_AGG(DISTINCT store_grade, '', '') AS store_grade,
	COUNT( distinct ( case when Allocated_Total > 0 then article end ) ) as Articles,
	sum(OH) as OH,
	sum(OO) as OO,
	sum(IT) as IT,
	sum(lt_forecast) AS lt_forecast,
	sum(Demand) as Demand,
	sum(min) as Min,
	sum(max) as max,
	sum(Allocated_Total) as Allocated_Total,
	sum(Demand * WOS) / nullif(sum(Demand), 0) as Target_WOS,
	sum(Demand * Current_WOS) / nullif(sum(Demand), 0) as Actual_WOS,
	count(distinct concat(article, size)) as Count_Article_Size,
	sum(OH_OO_InTransit) as OH_OO_InTransit,
	SUM(min_allocation) as min_allocation,
	SUM(wos_allocation) as wos_allocation
from
	strategy_table_2
join APS_table
		using(store)
group by
	1,
	2,
	3
),
final as (
select
	stf.Store,
	stf.store store_code,
	store_name,
	store_grade,
	--       smf2.climate,
	--       smf2.country,
	Articles,
	Min,
	Max,
	pd.packs_allocated,
	pd.loose_units_allocated,
	allocated_total_dc as Allocated_Total,
	allocated_total_dc allocated_quantity_dc,
	min_allocation as allocated_for_min,
	min_allocation min_allocation_dc,
	wos_allocation as allocated_for_wos,
	wos_allocation wos_allocation_dc,
	0 net_available,
	0 original_available,
	coalesce(round(Original_APS :: numeric, 2), 0) as Original_APS,
	coalesce(round(Forecast_APS :: numeric, 2), 0) as Forecast_APS,
	OH,
	OO,
	IT,
	lt_forecast,
	coalesce(round(Target_WOS :: numeric, 2), 0) as Target_WOS,
	Count_Article_Size,
	coalesce(round(Actual_WOS :: numeric, 2), 0) as Actual_WOS
from
	strategy_table_final stf
join pack_data pd
		using(store)
	--  LEFT JOIN (
	--      SELECT store_code, country FROM "global".store_master
	--  ) smf2 ON store = smf2.store_code
join allocated_dc c
		using(store)
)
select
	f.*,
	name as dc_name,
	dd.dc_codes,
	dd.dc_codes dc_code,
	name dc
from
	final f
join dc_data dd on
	f.store = dd.store
LEFT JOIN global.distribution_centres dcs ON dc_codes:: text = concat('''''''', dcs.dc_code:: text, '''''''') 



-----


				';
	else
	_query_combine := '

-----
with created as (
         select (created_at::date)::timestamp from inventory_smart.plan_master pm  
         WHERE plan_code = '''|| $2 ||'''
            )
,dc_data AS (
        SELECT store, TRIM( BOTH '''' FROM UNNEST(dc_codes)::varchar) AS dc_codes, "source"
        FROM inventory_smart.create_allocation_result_flat_gurobi carfg
        WHERE carfg.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
                and allocation_code =  '''|| $2 ||''' '|| _article_filter ||'
        GROUP BY 1, 2, 3
)
--select * from dc_data;
,

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
            trim("store") AS store,
            ("demand") AS Demand,
            ("ros") AS ROS,
            ("oh") AS OH,
            ("oo") AS OO,
            ("it") AS IT,
						("lt_forecast") AS lt_forecast,
            ("oh_oo_intransit") AS OH_OO_InTransit,
            ("wos") AS WOS,
            ("allocated_total") AS Allocated_Total,
            trim(allocation_code) AS allocation_code,
            ("allocated_total" + "oh_oo_intransit") / nullif("ros", 0) AS Current_WOS,
            aps,
            min,
			max,
            split_profile,
            saf.store_name,
            coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
            pack_dc_allocation,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) As packid,
		    (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
            CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END as min_short,
    		CASE WHEN allocated_total >= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
    		    THEN (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) ELSE allocated_total END as min_allocation,
    		CASE WHEN allocated_total>= (CASE WHEN updated_oh_oo_it >= min THEN 0 ELSE MIN - (updated_oh_oo_it) END) 
    		    THEN allocated_total - (case when updated_oh_oo_it >= min then 0 else MIN - (updated_oh_oo_it) END) ELSE allocated_total - allocated_total END as wos_allocation
        FROM
            inventory_smart.create_allocation_result_flat_gurobi carfs
        left join "global".store_attributes_filter saf 
	        on
		store_code = store
            WHERE carfs.created_at between (select created_at from created) and (select created_at + interval ''23 hours 59 minutes'' from created)
                and allocation_code =  '''|| $2 ||''' '|| _article_filter ||' 
    ) a
    WHERE size = packid
),
aps_split AS (
    SELECT article, store, APS_Artlvl * str_cnt * split_profile AS aps_upd
    FROM (
        SELECT article, store, split_profile
        FROM strategy_table
        GROUP BY 1, 2, 3
    ) AS a
    JOIN (
        SELECT article, AVG(APS_Artlvl) AS APS_Artlvl, COUNT(DISTINCT store) AS str_cnt
        FROM (
            SELECT article, store, SUM(aps) AS APS_Artlvl
            FROM strategy_table
            GROUP BY 1, 2
        ) AS b
        GROUP BY 1
    ) AS c
    USING(article)
),
strategy_table_2 AS (
    SELECT * FROM strategy_table
    JOIN aps_split USING(article, store)
),
APS_table AS (
    SELECT store,
           SUM(Demand_Art * APS_Art) / NULLIF(SUM(Demand_Art), 0) AS Original_APS,
           SUM(Demand_Art * ROS_Art) / NULLIF(SUM(Demand_Art), 0) AS Forecast_APS
    FROM (
        SELECT article, store, SUM(ROS) AS ROS_Art, AVG(aps_upd) AS APS_Art, SUM(Demand) AS Demand_Art
        FROM strategy_table_2
        GROUP by 1, 2
    ) a
    GROUP BY 1
),
pack_data AS (
    SELECT store, dc,
        COALESCE(SUM(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS packs_allocated,
        COALESCE(SUM(CASE WHEN pack_id NOT LIKE ''PPACK%'' THEN pack_allocated_qty END), 0) AS loose_units_allocated
    FROM (
        SELECT article,
               store, dc,
               TRIM( BOTH ''""'' FROM (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated''))::character varying) AS pack_id,
               (JSONB_ARRAY_ELEMENTS_TEXT(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
        FROM (
            SELECT article,
                   store,
                   JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
                   pack_dc_allocation
            FROM strategy_table
            GROUP BY 1, 2, 3, 4
        ) AS foo
        GROUP BY 1, 2, 3, 4, 5
    ) AS b
    GROUP BY 1, 2
),
allocated_dc AS (
    SELECT store, dc, SUM(allocated_total) as allocated_total_dc
    FROM strategy_table
    group by 1, 2
),
strategy_table_final AS (
    SELECT
        store AS Store,
        Original_APS,
        Forecast_APS,
		MAX(store_name) AS store_name,
        STRING_AGG(DISTINCT store_grade, '', '') AS store_grade,
        COUNT( DISTINCT ( CASE WHEN Allocated_Total > 0 THEN article END ) ) AS Articles,
        sum(OH) AS OH,
        sum(OO) AS OO,
        sum(IT) AS IT,
				sum(lt_forecast) AS lt_forecast,
        sum(Demand) AS Demand,
        sum(min) AS Min,
		sum(max) as Max,
        sum(Allocated_Total) AS Allocated_Total,
        sum(Demand * WOS) / nullif(sum(Demand), 0) AS Target_WOS,
        sum(Demand * Current_WOS) / nullif(sum(Demand), 0) AS Actual_WOS,
        count(DISTINCT concat(article, size)) AS Count_Article_Size,
        sum(OH_OO_InTransit) AS OH_OO_InTransit,
        SUM(min_allocation) AS min_allocation,
        SUM(wos_allocation) AS wos_allocation
    FROM strategy_table
    JOIN APS_table USING(store)
    GROUP BY 1, 2, 3
),
final AS (
    SELECT
        stf.Store,
		stf.store store_code,
        store_name,
        store_grade,
 --       smf2.climate,
 --       smf2.country,
        Articles,
        Min,
		Max,
        pd.packs_allocated,
        pd.loose_units_allocated,
        allocated_total_dc as Allocated_Total,
		allocated_total_dc allocated_quantity_dc,
        min_allocation AS allocated_for_min,
		min_allocation min_allocation_dc,
		wos_allocation as allocated_for_wos,
		wos_allocation wos_allocation_dc,
		0 net_available,
		0 original_available,
        coalesce(round(Original_APS :: numeric, 2), 0) AS Original_APS,
        coalesce(round(Forecast_APS :: numeric, 2), 0) AS Forecast_APS,
        OH,
        OO,
        IT,
				lt_forecast,
        coalesce(round(Target_WOS :: numeric, 2), 0) AS Target_WOS,
        Count_Article_Size,
        coalesce(round(Actual_WOS :: numeric, 2), 0) AS Actual_WOS
    FROM strategy_table_final stf
    JOIN pack_data pd USING(store)
  --  LEFT JOIN (
  --      SELECT store_code, country FROM "global".store_master
  --  ) smf2 ON store = smf2.store_code
    JOIN allocated_dc c USING(store)
)
select
	f.*,
	name as dc_name,
	dd.dc_codes,
	dd.dc_codes dc_code,
	name dc
from
	final f
join dc_data dd on
	f.store = dd.store
LEFT JOIN global.distribution_centres dcs ON dc_codes:: text = concat('''''''', dcs.dc_code:: text, '''''''') 


-----


				';
	end if;
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
