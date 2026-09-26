--liquibase formatted sql
--changeset liquibase:po_finalize_store_view_summary_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-137158 labels:MTP-137158
--comment: MTP-137158 Add allocated_stylecolor_stores CTE
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_store_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
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
 *                             $3 = Ignore allocation code
							$4 = article filter
							$5 = type
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
    begin;
    select * from inventory_smart.finalize_store_view_summary
        ('my_cur',
         'RG_TEST_22_SEPT');
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
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;
        _query_combine := format($$
            ----store summary
            WITH base_table as (
                SELECT carfs.*, channel, store store_code, retail_size_cd size FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
                WHERE allocation_code = '%1$s' %3$s
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key dc_code, 
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty        
                FROM (                                                                                          
                    SELECT article, store_code, channel, pack_dc_allocation FROM base_table                     
                    GROUP BY 1, 2, 3, 4                                                                         
                ) foo , JSONB_EACH(pack_dc_allocation) js                                                       
            )                                                                                                   
            ,packs AS (                                                                                         
                SELECT article,                                                                                 
                       dc_code,                                                                                 
                       store_code,
                       pack_type_id,
                       size,
                       channel,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       pack_type_id as size,
                       allocated_qty,
                       channel,
                       allocated_qty as packs_allocated_qty,
                       'E' as type
                FROM flat_table
                WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                UNION
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       size,
                       allocated_qty,
                       channel,
                       packs_allocated_qty,
                       'S' as type
               FROM packs
            )
            ,packs_base_with_product_code as (
            	SELECT pb.*, paf.product_code
    			FROM packs_base pb
            	LEFT JOIN global.product_attributes_filter paf USING(article, size)
            )      
            ,current_allocation as (
    			SELECT am.dc_code,
                       0 as user_reserve_qty,
    				   SUM(available_qty) oh
    			FROM (
    				SELECT dc_code, size, product_code, channel
    				FROM packs_base_with_product_code
    				GROUP BY 1, 2, 3, 4
    			) am
    			LEFT JOIN inventory_smart.po_master sa  
    			ON am.product_code = sa.product_code and am.dc_code = sa.po_code::text and am.channel = sa.channel
    			GROUP BY 1
    		)
    		,other_allocations as (
    			SELECT po_code dc_code,
    				   SUM(quantity) as allocated_reserve_qty
    			FROM inventory_smart.sku_po_allocations sda 
    			WHERE allocation_code not in ('%1$s', '%2$s')
    			group by 1
    		)
            ,final_inv as (
                SELECT dc_code,
                       SUM(allocated_qty) allocated_qty,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       SUM(user_reserve_qty) as user_reserve_qty,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                FROM (
                     SELECT dc_code,
                            SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1
                ) foo
                LEFT JOIN current_allocation USING (dc_code)
                LEFT JOIN other_allocations USING (dc_code)
                GROUP BY 1
            )
            ,cnt_cte as (
                SELECT COUNT(DISTINCT ( CASE WHEN allocated_total > 0 THEN article  END )) as art_cnt,
                       COUNT(DISTINCT ( CASE WHEN allocated_total > 0 THEN store_code  END )) as store_cnt
                FROM base_table
            )
            ,style_depth_cte as (
                SELECT AVG(art_cnt) as style_depth
                FROM (
                    SELECT store_code, COUNT(DISTINCT article) as art_cnt
                    FROM base_table
                GROUP BY 1
                ) as a
            )
            ,allocated_stylecolor_stores AS (
                SELECT
                    COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN (article, store_code) END) AS allocated_stylecolor_store_cnt
                FROM base_table
            )
            ,grade_data as (
                SELECT *,
                       CASE
                           WHEN store_grade = 'B' THEN 0
                           WHEN store_grade = 'D' THEN 1
                           WHEN store_grade = 'C' THEN 2
                           WHEN store_grade = 'A' THEN 3
                           WHEN store_grade = 'AA' THEN 4
                           WHEN store_grade = 'AAA' THEN 5
                           WHEN store_grade = '-' THEN 6
                           ELSE 6
                       END AS flag
                FROM (
                    SELECT COALESCE(NULLIF(TRIM(store_grade),''''), '-') as store_grade,
                           SUM(allocated_total) as allocated_units, -- store grade level
                           COUNT(DISTINCT store_code) as stores,
                           SUM(allocated_total) / COALESCE(COUNT(DISTINCT store_code), 1) as average
                    FROM base_table
                    GROUP BY 1
                ) as a
            )
            ,grade_b as (
                SELECT * FROM grade_data
                WHERE flag = (SELECT MIN(flag) FROM grade_data)
            )
            ,grade_final as (
                SELECT JSON_OBJECT_AGG(store_grade, ROUND(grade_index::numeric, 2)) grade_index,
                       JSON_OBJECT_AGG(store_grade, allocated_units) grade_allocated_units
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
                dc_code,
                allocated_qty,
                net_available,
                dc_code as dc,
                art_cnt,
                store_cnt,
                ROUND(style_depth::numeric, 2) as style_depth,
                allocated_stylecolor_store_cnt,
                grade_index,
                grade_allocated_units
            FROM final_inv
            -- LEFT JOIN global.distribution_centres dbc USING (dc_code)
            CROSS JOIN cnt_cte
            CROSS JOIN style_depth_cte
            CROSS JOIN allocated_stylecolor_stores
            CROSS JOIN grade_final
        $$, $2, $3, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;
