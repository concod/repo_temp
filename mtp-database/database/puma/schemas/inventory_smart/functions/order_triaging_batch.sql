--liquibase formatted sql
--changeset liquibase:order_triaging_batch-2 runOnChange:true stripComments:false splitStatements:false context:MTP-22565 labels:liquibase_project_start
--comment: Use user name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_batch(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_batch(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_triaging_batch
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
                SELECT carfs.*, channel, store store_code, retail_size_cd size, pm.updated_at as plan_update_date
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
            		   SUM(net_available) net_available
            	FROM final_inv
            	GROUP BY 1, 2
            ),
            article_store_level as (
            	SELECT allocation_code, article, store_code, dc_code,
                       SUM(allocated_qty) dc_allocated,
                       SUM(net_available) dc_available,
                       JSON_OBJECT_AGG(name, allocated_qty) dc_allocated_agg,
            		   JSON_OBJECT_AGG(name, net_available) dc_available_agg
            	FROM article_store_dc_level
            	LEFT JOIN final_inv_art USING(dc_code, article)
                LEFT JOIN global.distribution_centres USING(dc_code)
            	GROUP BY 1, 2, 3, 4
            ),shipping_date as (
                SELECT store_code, dc_data.key::int dc_code, dc_data.value::text as shipping_date, plan_code as allocation_code 
                FROM (
                    SELECT store_data.key as store_code, store_data.value::json as dc_data, plan_code
                    FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
                    WHERE plan_code in (select allocation_code from base_table) and attribute_name = 'shipping_date'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            ),dc_data as (
                SELECT dc_code, name,
                        CASE WHEN linked_store_code = 'PNA31' AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2 
                             WHEN linked_store_code = 'PNA31' AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                             WHEN linked_store_code = 'IN07' THEN 1
                             WHEN linked_store_code = 'PNA17' THEN 2
                             WHEN linked_store_code = 'PNA27' AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2
                             WHEN linked_store_code = 'PNA27' AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                             WHEN linked_store_code = 'UL01' and (current_time at time zone 'EST')::time > '14:15:00' THEN 3
                             WHEN linked_store_code = 'UL01' AND (current_time at time zone 'EST')::time <= '14:15:00' THEN 2
                             WHEN linked_store_code = 'IN01' THEN 1
                        ELSE 1 end lead_day
                FROM global.distribution_centres dcs
            )         
            SELECT asl.*, bt.min_constraint, bt.allocation_name, um.name user_id,
            	   paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.l4_name, paf.l5_name,
            	   saf.store_id, saf.store_name, COALESCE(sd.shipping_date, TO_CHAR(bt.plan_update_date + interval '1 day' * dcs.lead_day, 'MM-DD-YYYY')) as shipping_date
            FROM article_store_level asl
            LEFT JOIN (
            	SELECT allocation_code, store_code, article, description allocation_name, created_by user_id, SUM(min) min_constraint, plan_update_date
            	FROM base_table
            	GROUP BY 1, 2, 3, 4, 5, 7
            ) bt USING(allocation_code, store_code, article)
            LEFT JOIN (
                SELECT allocation_code, store_code, shipping_date from shipping_date
            ) sd USING(allocation_code, store_code)
            LEFT JOIN (
                SELECT dc_code, lead_day FROM dc_data
            ) dcs on dcs.dc_code = asl.dc_code
            LEFT JOIN (
            	SELECT article, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name
            	FROM global.product_attributes_filter paf
            	WHERE article IN (SELECT article FROM article_store_level)
            	GROUP BY 1, 2, 3, 4, 5, 6, 7
            ) paf USING(article)
            LEFT JOIN (
            	SELECT store_code, store_id, store_name
            	FROM global.store_attributes_filter
            	WHERE store_code IN (SELECT store_code FROM article_store_level)
            	GROUP BY 1, 2, 3
            ) saf USING(store_code)
            LEFT JOIN global.user_master um ON um.user_code = bt.user_id
            $$, $2, $3, _allocation_type_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;