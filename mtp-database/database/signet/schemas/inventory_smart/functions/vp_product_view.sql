--liquibase formatted sql
--changeset liquibase:vp_product_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vp_product_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.vp_product_view(input refcursor, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.vp_product_view(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.vp_product_view
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 							$3 = Store code
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	begin;
	select * from 
	inventory_smart.vp_product_view('my_cur'::refcursor,'6_3_ZALESOUTLET_20220926T080940', '');
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
	_store_filter text;

    begin
	    _store_filter := '';

		if ($3 = '') IS FALSE
			then
				_store_filter := ' WHERE store = '''||$3||''' ' ;
			end if;
		
	                _query_combine := '



------ VP product view

WITH strategy_table AS (
    SELECT * FROM (
        SELECT
            article,
			sub_sku,
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
            pack_dc_allocation,
            CASE WHEN demand_type = ''IA'' then  ''IA Forecast'' ELSE demand_type END AS demand_type,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) As packid,
            (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty
        FROM inventory_smart.create_allocation_result_flat_gurobi
         where allocation_code = '''|| $2 ||'''
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
strategy_table_final_overall AS (
    SELECT
        article AS Article,
		sub_sku,
        description AS description,
        demand_type,
        (ARRAY_REMOVE(ARRAY_AGG(color), null))[1] as Color,
        COUNT( DISTINCT ( CASE WHEN Allocated_Total > 0 THEN store END ) ) AS Store,
        sum(min) AS Min,
		sum(max) AS Max,
        sum(Allocated_Total) AS Allocated_total,
        avg(aps_upd) AS Original_APS,
        sum(ROS) AS Forecast_APS,
        sum(Demand * Current_WOS) / nullif(sum(Demand), 0) AS Actual_WOS,
        sum(OH) AS OH,
        sum(OO) AS OO,
        sum(IT) AS IT,
        sum(Demand * WOS) / nullif(sum(Demand), 0) AS Target_WOS,
        sum(OH_OO_InTransit) AS OH_OO_InTransit,
        count(DISTINCT concat(Store, size)) AS Count_Store_Size
    FROM strategy_table_2
 ' || _store_filter || '
  --  {store_filter}
 --   WHERE store = ''3703''  --input optional
    GROUP BY 1, 2, 3, 4
)
--select * from strategy_table_final_overall;
,
DC_Avai_Art AS (
    SELECT
        article, dc,
        sum(DC_Available2) AS DC_Available_Art,
        sum(Allocated_Total) AS Allocated_Total_Art
    FROM (
        SELECT
            article,
            size AS Size,
            dc,
            avg(pack_available_qty) AS DC_Available2,
            sum(Allocated_Total) AS Allocated_Total
        FROM strategy_table
        GROUP BY 1, 2, 3
    ) AS a
    GROUP BY 1, 2
),
allocated_dc AS (
    SELECT
    article, dc, SUM(allocated_total) as allocated_total_dc
    FROM strategy_table
 ' || _store_filter || '
    group By 1, 2
),
strategy_table_final_size AS (
    SELECT
        article AS Article,
        color AS Color,
        description AS description,
        size AS Size,
        count(DISTINCT store) AS Store_size,
        sum(Allocated_Total) AS Allocated_Quantity_size,
        avg(Inv_Avai) AS DC_Available,
        sum(OH) AS OH_size,
        sum(OO) AS OO_size,
        sum(IT) AS IT_size
    FROM strategy_table
 ' || _store_filter || '
    GROUP BY 1, 2, 3, 4
),
pack_data AS (
    SELECT article, dc,
        STRING_AGG(CASE WHEN pack_id LIKE ''PPACK%'' THEN pack_id else null end, '','') as packs,
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
 ' || _store_filter || '
            GROUP BY 1, 2, 3, 4
        ) AS foo
        GROUP BY 1, 2, 3, 4, 5
    ) AS b
    GROUP BY 1,2
),
Article_det AS (
    SELECT article, size, l0_name, l1_name, l2_name --needs to be generic
    FROM "global".product_attributes_filter pmf
),
final_result AS (
    SELECT
        a.Article,
		sub_sku,
        a.Color,
        a.description,
        demand_type,
        b.size,
        store,
        c.dc as dc_code,
        dcs.name as dc,
        Min,
		Max,
        pd.packs,
        pd.packs_allocated,
        pd.loose_units_allocated,
        allocated_total_dc as allocated_total,
        (DC_Available_Art - Allocated_Total_Art) AS inventory_available,
        coalesce(round(Original_APS :: numeric, 2), 0) AS Original_APS,
        coalesce(round(Forecast_APS :: numeric, 2), 0) AS Forecast_APS,
        coalesce(round(Target_WOS :: numeric, 2), 0) AS Target_WOS,
        Count_Store_Size,
        coalesce(round(Actual_WOS :: numeric, 2), 0) AS Actual_WOS,
        allocated_quantity_size,
        l0_name, l1_name, l2_name
    FROM
        strategy_table_final_overall AS a
        LEFT JOIN strategy_table_final_size AS b ON a.article = b.article
        LEFT JOIN DC_Avai_Art AS c ON a.article = c.article
        LEFT JOIN Article_det AS d ON b.article = d.article
        AND b.size = d.size
        LEFT JOIN pack_data as pd ON a.article = pd.article AND c.dc = pd.dc
        JOIN allocated_dc as adc ON adc.article = a.article AND adc.dc = c.dc
        
left join global.distribution_centres dcs on
	c.dc = dcs.dc_code:: text
	
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, l1_name, l2_name
)
SELECT 
 ast."order", 
 fr.*
FROM final_result AS fr
left join inventory_smart.article_status_tag ast
on fr.article  = ast.product_code 

-----


				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
