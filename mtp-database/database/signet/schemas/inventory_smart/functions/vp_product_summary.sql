--liquibase formatted sql
--changeset liquibase:vp_product_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vp_product_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.vp_product_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.vp_product_summary(input refcursor, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.vp_product_summary
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 * 						   $3 = Dummy
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
	begin;
	select * from 
	inventory_smart.vp_product_summary('my_cur'::refcursor,'6_3_ZALESOUTLET_20220926T080940');
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



------ VP product sumamry


WITH base AS (
    SELECT * FROM (
        SELECT
            carfs.article,
            store,
            carfs.retail_size_cd AS size,
            "order" AS size_order,
            JSONB_OBJECT_KEYS(pack_dc_allocation) AS dc,
            allocated_total AS allocated_units,
            trim( both ''""'' from (jsonb_array_elements(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_allocated''))::character varying) as packid,
            ((JSONB_ARRAY_ELEMENTS(pack_dc_allocation->JSONB_OBJECT_KEYS(pack_dc_allocation)->''packs_available_qty''))::int) AS inventory
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        WHERE allocation_code =  '''|| $2 ||'''
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
			raise notice '%', _query_combine;
            OPEN $1 FOR execute _query_combine;  
			RETURN $1;
        end
$function$
;
