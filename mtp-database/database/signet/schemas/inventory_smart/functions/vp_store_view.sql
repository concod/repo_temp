--liquibase formatted sql
--changeset liquibase:vp_store_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vp_store_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.vp_store_view(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.vp_store_view(input refcursor, character varying, character varying)
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
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	select * from inventory_smart.vp_store_view
	    ('my_cur',
	     '6_3_FactoryLineRetail_20221020T093357');
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

    begin


    	_query_combine := '

-----


WITH dc_data AS (
        SELECT store, TRIM( BOTH '''' FROM UNNEST(dc_codes)::varchar) AS dc_codes, "source"
        FROM inventory_smart.create_allocation_result_flat_gurobi carfg
        WHERE allocation_code = '''|| $2 ||'''
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
		    (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
            CASE WHEN oh + it + oo >= min THEN 0 ELSE MIN - (oh+it+oo) END as min_short,
    		CASE WHEN allocated_total >= (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) 
    		    THEN (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) ELSE allocated_total END as min_allocation,
    		CASE WHEN allocated_total>= (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) 
    		    THEN allocated_total - (case when oh+it+oo >= min then 0 else MIN - (oh+it+oo) END) ELSE allocated_total - allocated_total END as wos_allocation
        FROM
            inventory_smart.create_allocation_result_flat_gurobi carfs
        left join "global".store_attributes_filter saf 
	        on
		store_code = store
            WHERE allocation_code = '''|| $2 ||''' 
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
               (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
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
        store_name,
        store_grade,
        Original_APS,
        Forecast_APS,
        COUNT( DISTINCT ( CASE WHEN Allocated_Total > 0 THEN article END ) ) AS Articles,
        sum(OH) AS OH,
        sum(OO) AS OO,
        sum(IT) AS IT,
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
    GROUP BY 1, 2, 3, 4, 5 
),
final AS (
    SELECT
        stf.Store,
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
        min_allocation AS allocated_for_min,
        wos_allocation AS allocated_for_wos,
        coalesce(round(Original_APS :: numeric, 2), 0) AS Original_APS,
        coalesce(round(Forecast_APS :: numeric, 2), 0) AS Forecast_APS,
        OH,
        OO,
        IT,
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
	dd.dc_codes
from
	final f
join dc_data dd on
	f.store = dd.store
LEFT JOIN global.distribution_centres dcs ON dc_codes:: text = concat('''''''', dcs.dc_code:: text, '''''''') 


-----


				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
