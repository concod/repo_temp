--liquibase formatted sql
--changeset liquibase:order_triaging_metirc runOnChange:true stripComments:false splitStatements:false context:MTP-18837-bf-1 labels:liquibase_project_start
--comment: MTP-18837-bf-1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_metric(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_metric(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_triaging_metric
  * Created by: Suba Selvandran N
  * Created at: 23-May-2023
  * No of input parameter: 3
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
declare
    _query_combine text;
    _allocation_type_filter text;
    begin
        _allocation_type_filter = REPLACE($4, 'order_type', 'type');
        _query_combine := format($$
            WITH product_filters AS (
                SELECT * FROM
                global.product_attributes_filter %1$s
            )
            ,store_filters AS (
                SELECT * FROM
                global.store_attributes_filter %2$s
            )
            ,base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                LEFT JOIN (
                    SELECT * FROM inventory_smart.plan_master %3$s
                ) pm ON carfs.allocation_code = pm.plan_code
                WHERE article IN (SELECT article FROM product_filters)
                      AND store IN (SELECT store_code FROM store_filters)
                      AND pm.status = 2
            )
            ,flat_table as (
                SELECT allocation_code,
                       article,
                       store_code,
                       js.key::int dc_code, 
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   	   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                FROM (
                    SELECT allocation_code, article, store_code, channel, pack_dc_allocation FROM base_table 
                    GROUP BY 1, 2, 3, 4, 5
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )                            
            ,packs AS (
                SELECT allocation_code,
                       article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       size,
                       channel,
                       available_qty,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT allocation_code,
                       article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       pack_type_id as size,
                       allocated_qty,
                       channel,
                       available_qty,
                       allocated_qty as packs_allocated_qty,
                       'E' as type
                FROM flat_table
                WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                UNION
                SELECT allocation_code,
                       article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       size,
                       allocated_qty,
                       channel,
                       available_qty,
                       packs_allocated_qty,
                       'S' as type
               FROM packs
            )
            ,article_store_dc_level as (
            	SELECT allocation_code,
            		   article,
            		   store_code,
            		   dc_code,
            		   SUM(allocated_qty) as allocated_qty
            	FROM packs_base
            	GROUP BY 1, 2, 3, 4
            )
            ,current_allocation as (
                SELECT dc_code, article, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                FROM (
                    SELECT article, size, dc_code FROM packs_base GROUP BY 1, 2, 3
                ) a 
    				left join inventory_smart.sku_dc_available_units USING(article, dc_code, size)
                GROUP BY 1, 2, 3
            )
            ,reserve_allocation as (
                SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                FROM (
                    SELECT dc_code, article, size FROM packs_base
                    GROUP BY 1, 2, 3
                ) am
                LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                USING (dc_code, article, size)
                GROUP BY 1, 2, 3
            )
            ,other_allocations as (
                SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) am
                    JOIN inventory_smart.sku_dc_allocated_units
                    USING (dc_code, article, size, pack_type_id)
                    WHERE allocation_code NOT IN (SELECT allocation_code FROM base_table)
                ) a
                GROUP BY 1, 2, 3
            )
            ,final_inv as (
                SELECT dc_code,
                       article,
                       size,
                       sum(allocated_qty) allocated_qty,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       SUM(user_reserve_qty) as user_reserve_qty,
                       greatest((COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0))::int, 0) as net_available
                FROM (
                     SELECT dc_code,
                            article,
                            size,
                            SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1, 2, 3
                ) foo
                LEFT JOIN current_allocation USING (dc_code, article, size)
                LEFT JOIN reserve_allocation USING (dc_code, article, size)
                LEFT JOIN other_allocations USING (dc_code, article, size)
                GROUP BY 1, 2, 3
            ),
            final_inv_art as (
            	SELECT dc_code,
            		   article,
            		   SUM(net_available) net_available,
                       SUM(user_reserve_qty) user_reserve_qty,
                       SUM(allocated_qty) allocated_qty
            	FROM final_inv
            	GROUP BY 1, 2
            ),
            article_store_level as (
            	SELECT allocation_code, article, store_code,
                       SUM(asdc.allocated_qty) dc_allocated,
                       SUM(net_available) dc_available,
                       JSON_OBJECT_AGG(name, asdc.allocated_qty) dc_allocated_agg,
            		   JSON_OBJECT_AGG(name, net_available) dc_available_agg
            	FROM article_store_dc_level asdc
            	LEFT JOIN final_inv_art fi USING(dc_code, article)
                LEFT JOIN global.distribution_centres USING(dc_code)
            	GROUP BY 1, 2, 3
            )         
            SELECT
                COALESCE(COUNT(DISTINCT allocation_code), 0) AS allocation_count,
                COALESCE(COUNT(DISTINCT article), 0) AS article_count,
                COALESCE(SUM(dc_allocated):: INTEGER, 0) AS allocated_units,
                COALESCE((SELECT SUM(net_available) FROM final_inv_art), 0) dc_avail,
                COALESCE((SELECT SUM(user_reserve_qty) FROM final_inv_art), 0) reserve_qty,
                COALESCE(COUNT(DISTINCT store_code), 0) AS no_of_stores,
                (   
                    SELECT JSON_OBJECT_AGG(name, allocated_qty)
                    FROM (
                        SELECT dc_code, SUM(allocated_qty) allocated_qty
                        FROM final_inv_art
                        GROUP BY 1
                    ) sq
                    LEFT JOIN global.distribution_centres USING(dc_code)
                ) dc_wise_allocations
            FROM
                article_store_level
                WHERE dc_allocated > 0
            $$, $2, $3, _allocation_type_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;