--liquibase formatted sql
--changeset liquibase:vp_store_view_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vp_store_view_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.vp_store_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.vp_store_view_summary(input refcursor, character varying, character varying)
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
 * 
     begin;
	select * from inventory_smart.vp_store_view_summary
	    ('my_cur',
	     '6_3_FactoryLineRetail_20221020T093357');
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

				WITH strategy_table AS (
				    SELECT a.*, name as dc FROM (
				        SELECT article, store, inv_avai, allocated_total, coalesce(NULLIF(TRIM(carfs.store_grade),''''), ''-'') as store_grade,
				        JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc2,
				        (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int as pack_available_qty,
				        trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid
				        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
				        WHERE allocation_code = '''|| $2 ||'''
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
				),
				grade_final AS (
				    SELECT
				        a.*,
						CASE 
						      WHEN  b.average = 0  THEN 0
						      ELSE a.average / b.average 
						END as grade_index
				    FROM grade_data a
				    CROSS JOIN grade_b b
				)
				SELECT
				    dc,
				    art_cnt,
				    store_cnt,
				    Round(style_depth :: NUMERIC, 2) AS style_depth,
				    allocated_units_total as  allocated_total,
				    inventory_available,
				    store_grade,
				    allocated_units,
				    Round(grade_index :: NUMERIC, 2) AS grade_index
				FROM
				    first_table
				    CROSS JOIN second_table
				    CROSS JOIN grade_final
				GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9

				';
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
