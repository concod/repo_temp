--liquibase formatted sql
--changeset liquibase:finalize_store_view runOnChange:true stripComments:false splitStatements:false context:MTP-28337 labels:MTP-28337
--comment: $ Handled the type-casting of dc_code column for po case.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying);
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
    _allocation_code_without_edit text;
    _article_filter text;
    _final_inv_query text;
    _dc_query text;
    begin
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;
        _dc_query := $$
            ,dc_data as (
                SELECT dc_code::text dc_code, name,
                        CASE WHEN dc_code = 97 AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2 
                             WHEN dc_code = 97 AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                             WHEN dc_code = 92 THEN 1
                             WHEN dc_code = 93 THEN 2
                             WHEN dc_code = 96 AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2
                             WHEN dc_code = 96 AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                             WHEN dc_code = 94 and (current_time at time zone 'EST')::time > '14:15:00' THEN 3
                             WHEN dc_code = 94 AND (current_time at time zone 'EST')::time <= '14:15:00' THEN 2
                             WHEN dc_code = 95 THEN 1
                        ELSE 1 end lead_day
                FROM global.distribution_centres dcs
            )
        $$;
        CASE $5
        WHEN 'allocated'
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT SUM(oh) oh
                    FROM (
                        SELECT article, dc_code::int dc_code, channel FROM packs_base
                        GROUP BY 1, 2, 3
                    ) a 
                    LEFT JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code)
                )
                ,reserve_allocation as (
                    SELECT SUM(user_reserve_qty) user_reserve_qty
                    FROM (
                        SELECT dc_code, SUM(COALESCE(quantity,0)) user_reserve_qty 
                        FROM (
                            SELECT article, dc_code::int dc_code, channel FROM packs_base
                            GROUP BY 1, 2, 3
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                        USING (dc_code, article, channel)
                        GROUP BY 1
                    ) sq
                )
                ,other_allocations as (
                    SELECT SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, channel, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT article, dc_code::int dc_code, channel FROM packs_base
                            GROUP BY 1, 2, 3
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_allocated_units 
                        USING (dc_code, article, channel)
                        GROUP BY 1, 2, 3, 4
                    ) a
                )
                ,final_inv as (
                    SELECT COALESCE(oh, 0) - COALESCE(user_reserve_qty, 0) - COALESCE(allocated_reserve_qty, 0) as net_available
                    FROM current_allocation CROSS JOIN reserve_allocation CROSS JOIN other_allocations
                )
            $$;
        WHEN 'po'
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT SUM(oh) oh
                    FROM (
                        SELECT article, dc_code, channel FROM packs_base
                        GROUP BY 1, 2, 3
                    ) a 
                    LEFT JOIN inventory_smart.sku_po_available_units po
                    ON a.article = po.article AND a.channel = po.channel AND a.dc_code = po.po_code
                )
                ,other_allocations as (
                    SELECT SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, channel, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT article, dc_code, channel FROM packs_base
                            GROUP BY 1, 2, 3
                        ) am
                        LEFT JOIN inventory_smart.sku_po_allocated_units 
                        USING (dc_code, article, channel)
                        GROUP BY 1, 2, 3, 4
                    ) a
                )
                ,final_inv as (
                    SELECT COALESCE(oh, 0)  - COALESCE(allocated_reserve_qty, 0) as net_available
                    FROM current_allocation CROSS JOIN other_allocations
                )
            $$;
            _dc_query := $$
                ,dc_data as (
                    SELECT dc_code, dc_code name
                    FROM packs_base
                    GROUP BY 1
                )
            $$;
        ELSE
            _final_inv_query := $$
                ,final_inv as (
                    SELECT COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
                    FROM (
                        SELECT
                            article,
                            size,
                            dc_code,
                            SUM(allocated_qty) as allocated_qty,
                            avg(available_qty) as available_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) a
                )
            $$;
        END CASE;
        _allocation_code_without_edit := REPLACE($2, 'edit_', '');         
        _query_combine := format($$
            ------ STORE VIEW TABLE DATA
            WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %3$s
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key dc_code, 
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                          UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
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
                       available_qty,
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
                       available_qty,
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
                       available_qty,
                       packs_allocated_qty,
                       'S' as type
               FROM packs
            )
            %4$s
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
            ,size_level_order AS (
                SELECT 
                    sq.article,
                    bt.store_code,
                    bt.size,
                    ast.order,
                    product_code
                FROM base_table_min_wos bt
                LEFT JOIN (
                    SELECT article, paf.size, paf.product_code FROM global.product_attributes_filter paf WHERE paf.article IN (SELECT DISTINCT article FROM base_table) AND paf.active
                        ) sq USING (size)
                LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
                GROUP BY 1,2,3,4,5
                )
            --select * from size_level_order;
            ,store_size_level AS (
                SELECT
                    store_code,
                    size,
                    MIN(slo.order) as order
                FROM size_level_order slo
                GROUP BY store_code, size
                --order by slo.order

			)
			--select * from store_size_level;
			,store_size_orders AS (
		        SELECT
                    store_code, array_agg(size ORDER BY ssl.order) AS sizes
		        FROM store_size_level ssl
                    GROUP BY store_code
			)
--			select * from store_size_orders;
            ,store_level_base_table as (
                SELECT store_code,
                       array_agg(distinct(store_grade)) store_grade,
                       ROUND(AVG(aps_upd)::NUMERIC, 2) as original_aps,
                       ROUND(SUM(ros)::NUMERIC, 2) as forecast_aps,
                       SUM(oh) as oh,
                       SUM(oo) as oo,
                       SUM(it) as it,
                       jsonb_object_agg(article, oh_size) oh_size,
                       jsonb_object_agg(article, it_size) it_size,
                       jsonb_object_agg(article, oo_size) oo_size,
                       SUM(MIN) as min,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       --ROUND((SUM(demand * wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as target_wos,
                       --ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as actual_wos,
                       (CASE 
                        WHEN SUM(demand) >0 
                            THEN ROUND((SUM(demand * wos) / SUM(demand))::NUMERIC, 2)
                        ELSE 
                            SUM(wos)::numeric
                        END ) as target_wos,
                       (CASE 
                        WHEN SUM(demand) > 0 
                            THEN ROUND((SUM(demand * current_wos) / SUM(demand))::NUMERIC, 2)
                        ELSE 
                            SUM(current_wos)::numeric
                        END ) as actual_wos,
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
                           store_grade,
                           size,
                           demand_type,
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
                    GROUP BY 1, 2, 3, 4, 5
                ) as st
                JOIN aps_split aps USING(article, store_code)
                LEFT JOIN (
                    SELECT article, COUNT(distinct size) as size_count
                    FROM base_table_min_wos
                    GROUP BY 1
                ) as artdet
                USING(article)
                LEFT JOIN (
                    SELECT 
                    store_code, 
                    article, 
                    JSONB_OBJECT_AGG(size, oh) oh_size,
                    JSONB_OBJECT_AGG(size, oo) oo_size,
                    JSONB_OBJECT_AGG(size, it) it_size
                    FROM (
                        SELECT store_code,
                               article,
                               size,
                               MAX(oh) oh,
                               MAX(oo) oo,
                               MAX(it) it
                        FROM base_table_min_wos bt
                        GROUP BY 1, 2, 3
                    ) sq
                    GROUP BY 1, 2
                ) sq USING(article, store_code)
                GROUP BY 1
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
            %5$s
            SELECT sl.*, dl.*, COALESCE(dcs.name, dl.dc_code) dc, sso.sizes, net_available, smf.store_name, store_code store, aid.*, smf.district, smf.state , smf.climate
            FROM store_level_base_table sl
            LEFT JOIN store_size_orders sso USING(store_code)
            LEFT JOIN dc_level_min_wos dl USING(store_code)
            LEFT JOIN dc_data dcs using(dc_code)
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            LEFT JOIN (
                SELECT store_code,
                        COALESCE(SUM(lw_qty), 0) as lw_qty,
                        COALESCE(SUM(lw_revenue), 0) as lw_revenue,
                        COALESCE(SUM(sales_1_ago), 0) as sales_1_ago,
                        COALESCE(SUM(sales_2_ago), 0) as sales_2_ago,
                        COALESCE(SUM(sales_3_ago), 0) as sales_3_ago,
                        COALESCE(SUM(sales_4_ago), 0) as sales_4_ago,
                        COALESCE(SUM(week_to_date_sales), 0) as week_to_date_sales,
                        COALESCE(SUM(last_day_sales), 0) as last_day_sales,
                        COALESCE(SUM(sales_revenue_1_ago), 0) as sales_revenue_1_ago,
                        COALESCE(SUM(sales_revenue_2_ago), 0) as sales_revenue_2_ago,
                        COALESCE(SUM(sales_revenue_3_ago), 0) as sales_revenue_3_ago,
                        COALESCE(SUM(sales_revenue_4_ago), 0) as sales_revenue_4_ago,
                        COALESCE(SUM(week_to_date_sales_revenue), 0) as week_to_date_sales_revenue,
                        COALESCE(SUM(last_day_sales_revenue), 0) as last_day_sales_revenue,
                        COALESCE(ROUND(COALESCE(SUM(lw_margin), 0)::decimal,2), 0) as lw_margin,
                        COALESCE(ROUND(COALESCE((SUM(lw_revenue) / NULLIF( SUM(lw_qty), 0 )),0)::decimal,2), 0) as price,
                        COALESCE(ROUND(COALESCE(AVG(promo_percentage),0)::decimal,2), 0) as promo
                FROM (SELECT store_code from base_table GROUP BY 1) a
                LEFT JOIN (
                    SELECT * FROM inventory_smart.article_inventory_dashboard aid
                    WHERE store_code in (SELECT distinct store_code from base_table) and article in (SELECT distinct article from base_table)
                ) b USING(store_code)
                GROUP BY store_code
            ) aid using (store_code)
            CROSS JOIN final_inv
        $$, $2, _allocation_code_without_edit, _article_filter, _final_inv_query, _dc_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;
