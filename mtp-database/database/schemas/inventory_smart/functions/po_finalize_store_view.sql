--liquibase formatted sql
--changeset liquibase:po_finalize_store_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_finalize_store_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_store_view(input refcursor, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
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
    _allocation_code_without_edit text;
    _article_filter text;
    begin
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;
        _allocation_code_without_edit := REPLACE($2, 'edit_', '');         
        _query_combine := format($$
            ------ STORE VIEW TABLE DATA
            WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %4$s
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
    			SELECT 0 as user_reserve_qty,
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
    			SELECT SUM(quantity) as allocated_reserve_qty
    			FROM inventory_smart.sku_po_allocations sda 
    			WHERE allocation_code not in ('%1$s', '%2$s') AND po_code in (SELECT DISTINCT dc_code FROM packs_base)
    		)
            ,final_inv as (
              SELECT oh - COALESCE(user_reserve_qty, 0) - COALESCE(allocated_reserve_qty, 0) as net_available
              FROM current_allocation CROSS JOIN other_allocations
            )
            ,base_table_min_wos AS (
                SELECT b.*,
                       GREATEST(0, MIN - (oh + it + oo)) as min_short,
                       GREATEST(0, allocated_total - GREATEST(0, MIN - (oh + it + oo))) as wos_allocation,
                       LEAST(allocated_total, GREATEST(0, MIN - (oh + it + oo))) as min_allocation
                FROM base_table b
            )
            ,aps_split as (
                SELECT article,
                       store_code,
                       aps_artlvl * str_cnt * split_profile as aps_upd
                  FROM (
                      SELECT article,
                           store_code,
                             split_profile
                      FROM base_table
                      GROUP BY 1, 2, 3 
                  ) AS a
                  JOIN (
                      SELECT article,
                             AVG(aps_artlvl) as aps_artlvl,
                             COUNT(distinct store_code) as str_cnt
                        FROM (
                            SELECT article,
                                   store_code,
                                   SUM(aps) as aps_artlvl
                            FROM base_table
                        GROUP BY 1, 2 
                        ) as b
                    GROUP BY 1 
                  ) as c
                USING(article) 
            )
            ,store_level_base_table as (
                SELECT store_code,
                       store_name,
                       store_grade,
                       order_type,
                       delivery_dt,
                       ROUND(AVG(aps_upd)::NUMERIC, 2) as original_aps,
                       ROUND(SUM(ros)::NUMERIC, 2) as forecast_aps,
                       SUM(oh) as oh,
                       SUM(oo) as oo,
                       SUM(it) as it,
                       SUM(MIN) as min,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       ROUND((SUM(demand * wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as target_wos,
                       ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as actual_wos,
                       SUM(allocated_total) as allocated_quantity,
                       (
                            (
                                COUNT (
                                    DISTINCT(
                                        CASE
                                            WHEN oh_oo_intransit + allocated_total > 0 THEN size
                                           END
                                       )
                                )
                            )::FLOAT8 / MAX(size_count)::FLOAT8
                        ) as size_integrity,
                        COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
                FROM (
                    SELECT article,
                           store_code,
                           store_name,
                           store_grade,
                           size,
                           demand_type,
                           order_type,
                           delivery_dt,
                           MAX(demand) demand,
                           MAX(MIN) MIN,
                           MAX(MAX) MAX,
                           SUM(min_allocation) as min_allocation,
                           SUM(wos_allocation) as wos_allocation,
                           MAX(ros) ros,
                           MAX(oh) oh,
                           MAX(oo) oo,
                           MAX(it) it,
                           MAX(oh_oo_intransit) oh_oo_intransit,
                           MAX(wos) wos,
                           SUM(allocated_total) allocated_total,
                           ((SUM(allocated_total) + MAX(oh_oo_intransit)) / nullif(MAX(ros), 0)) as current_wos
                    FROM base_table_min_wos bt
                    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
                ) as st
                JOIN aps_split aps USING(article, store_code)
                LEFT JOIN (
                    SELECT article, COUNT(distinct size) as size_count
                    FROM base_table_min_wos
                    GROUP BY 1
                ) as artdet
                USING(article)
                GROUP BY 1, 2, 3, 4, 5
            )
            ,dc_level_min_wos as (
                SELECT
                    store_code,
                    dc_code,
                    SUM(allocated_total) as allocated_quantity_dc,
                    SUM(min_allocation) as min_allocation_dc,
                    SUM(wos_allocation) as wos_allocation_dc
                FROM (
                    SELECT *,
                           GREATEST(0, MIN - (oh + it + oo)) as min_short,
                           GREATEST(0, allocated_total - GREATEST(0, MIN - (oh + it + oo))) as wos_allocation,
                           LEAST(allocated_total, GREATEST(0, MIN - (oh + it + oo))) as min_allocation
                    FROM (
                        SELECT *
                        FROM (
                            SELECT article, store_code, size, channel, min, oh, it, oo, JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                            FROM base_table
                        ) foo
                        LEFT JOIN (
                            SELECT article, store_code, dc_code, size, channel, SUM(allocated_qty) allocated_total
                            FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) inv USING(dc_code, size, article, store_code, channel)
                    ) foo
                ) foo
                GROUP BY 1, 2
            )
            -- ,shipping_date as (
            --     SELECT store_code, dc_data.key::int dc_code, dc_data.value::text as shipping_date 
            --     FROM (
            --         SELECT store_data.key as store_code, store_data.value::json as dc_data
            --         FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
            --         WHERE plan_code = '%2$s'  and attribute_name = 'shipping_date'
            --     ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            -- )
            -- ,cancel_date as (
            --     SELECT store_code, dc_data.key::int dc_code, dc_data.value::text as cancel_date 
            --     FROM (
            --         SELECT store_data.key as store_code, store_data.value::json as dc_data
            --         FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
            --         WHERE plan_code = '%2$s'  and attribute_name = 'cancel_date'
            --     ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            -- )
            -- ,store_priorities as (
            --     SELECT store_code, dc_data.key::int dc_code, dc_data.value::text as priority_code
            --     FROM (
            --         SELECT store_data.key as store_code, store_data.value::json as dc_data
            --         FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT((a.attribute_value::JSON)->'store_priorities') as store_data
            --         WHERE plan_code = '%2$s' AND attribute_name = 'store_level_data'
            --     ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            -- )
            -- ,dc_data as (
            --     SELECT dc_code, name,
            --             CASE WHEN dc_code = 97 AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2 
            --                  WHEN dc_code = 97 AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
            --                  WHEN dc_code = 92 THEN 1
            --                  WHEN dc_code = 93 THEN 2
            --                  WHEN dc_code = 96 AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2
            --                  WHEN dc_code = 96 AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
            --                  WHEN dc_code = 94 and (current_time at time zone 'EST')::time > '14:15:00' THEN 3
            --                  WHEN dc_code = 94 AND (current_time at time zone 'EST')::time <= '14:15:00' THEN 2
            --                  WHEN dc_code = 95 THEN 1
            --             ELSE 1 end lead_day
            --     FROM global.distribution_centres dcs
            -- )
            SELECT sl.* , dl.*, dl.dc_code dc, net_available, store_code store
                --    COALESCE(sd.shipping_date, TO_CHAR(Date(now() + interval '1 day' * dcs.lead_day), 'MM-DD-YYYY')) as shipping_date,
                --    COALESCE(cd.cancel_date, TO_CHAR(Date(now() + interval '30 day'), 'MM-DD-YYYY')) as cancel_date,
                --    COALESCE(sp.priority_code, CASE WHEN smf.channel = 'RLS' THEN 'R' ELSE 'S' END) priority_code
            FROM store_level_base_table sl
            LEFT JOIN dc_level_min_wos dl USING(store_code)
            -- LEFT JOIN shipping_date sd using(store_code, dc_code)
            -- LEFT JOIN cancel_date cd using(store_code, dc_code)
            -- LEFT JOIN store_priorities sp USING (dc_code, store_code)
            -- LEFT JOIN dc_data dcs using(dc_code) 
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            CROSS JOIN final_inv
        $$, $2, $3, _allocation_code_without_edit, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;