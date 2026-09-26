--liquibase formatted sql
--changeset liquibase:vp_product_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vp_product_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.vp_product_store(input refcursor, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.vp_product_store(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.vp_product_store
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 							$3 = Store code
 * 							$4 = Article code/SKU code
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	begin;
	select * from 
	inventory_smart.vp_product_store('my_cur'::refcursor,'6_3_ZALESOUTLET_20220926T080940', 'D.2668', '20352395');
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
		
		
	                _query_combine := '




------ VP product store view


WITH strategy_table AS (
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
            ("demand") AS Demand,
			constrained_forecast,
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
            store_name,
            store_grade,
            original_forecast,
            pack_dc_allocation,
            CASE WHEN demand_type = ''IA'' then  ''IA Forecast'' ELSE demand_type END AS demand_type,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) As packid,
            (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
            CASE WHEN oh + it + oo >= min THEN 0 ELSE MIN - (oh+it+oo) END as min_short,
                CASE WHEN allocated_total >= (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) 
                    THEN (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) ELSE allocated_total END as min_allocation,
                CASE WHEN allocated_total>= (CASE WHEN oh+it+oo >= min THEN 0 ELSE MIN - (oh+it+oo) END) 
                    THEN allocated_total - (case when oh+it+oo >= min then 0 else MIN - (oh+it+oo) END) ELSE allocated_total - allocated_total END as wos_allocation
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        WHERE allocation_code = '''|| $2 ||'''   ' || _article_filter || '
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
               (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty
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
        SUM(OH_OO_InTransit) AS OH_OO_InTransit,
        sum(Demand * WOS) / nullif(sum(Demand), 0) AS Target_WOS,
        sum(Demand * Current_WOS) / nullif(sum(Demand), 0) AS Actual_WOS,
        ( ( COUNT (distinct ( CASE WHEN OH_OO_InTransit + Allocated_Total > 0 THEN size
                    END
        ) ) ) :: float8 / max(size_count) :: float8
        ) AS size_integrity
    FROM strategy_table_2
    LEFT JOIN Article_det AS artdet USING(article)
    GROUP BY 1, 2, 3, 4, 5
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
            sum(Allocated_Total) AS Allocated_Quantity_size,
            sum(OH) AS OH_size,
            sum(OO) AS OO_size,
            sum(IT) AS IT_size
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
        Min,
		Max,
        pd.packs,
        pd.packs_allocated,
        pd.loose_units_allocated,
        allocated_total_dc AS Allocated_Quantity,
        (DC_Available_art - Allocated_Total_art) AS DC_Avai_Art,
        min_allocation AS allocated_for_min,
        wos_allocation AS allocated_for_wos,
        round(Original_APS :: numeric, 2) AS Original_APS,
        round(Forecast_APS :: numeric, 2) AS Forecast_APS,
        OH,
        OO,
        IT,
        round(Target_WOS :: numeric, 2) AS Target_WOS,
        round(Actual_WOS :: numeric, 2) AS Actual_WOS,
        Demand_size,
        allocated_quantity_size,
        OH_size,
        OO_size,
        IT_size,
        (DC_Available_size - Total_Allocated_size) AS DC_Available_size_final,
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
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
)--,
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
SELECT final_result.*
FROM final_result
--JOIN order_data ON final_result.size = order_data.size
--ORDER BY order_data.order

-----


				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
