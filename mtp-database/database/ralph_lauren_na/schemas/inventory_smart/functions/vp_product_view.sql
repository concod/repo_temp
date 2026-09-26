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
  * Function/Procedure name: inventory_smart.finalize_product_view
  * Created by: Renugopal S
  * Created at: 21-July-2022
  * No of input parameter: 2
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = article filter
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
 
     begin;
     select * from inventory_smart.finalize_product_view
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
         '');
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
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
    begin
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$WHERE store_code = '%s'$$, $3);
            end if;
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;

        IF FALSE
        THEN
            _final_inv_query := $$
            ,current_allocation as (
                SELECT dc_code, article, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                FROM (
                    SELECT article, size, dc_code FROM packs_base GROUP BY 1, 2, 3
                ) a 
                LEFT JOIN inventory_smart.sku_dc_available_units USING(dc_code, article, size)
                GROUP BY 1, 2
            )
            -- select * from current_allocation
            -- 
            ,reserve_allocation as (
                SELECT dc_code, article, MAX(COALESCE(quantity,0)) user_reserve_qty 
                  FROM (
                      SELECT dc_code, article, size FROM packs_base
                     GROUP BY 1, 2, 3
                  ) am
                LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                USING (dc_code, article, size)
                GROUP BY 1, 2
            )
            ,other_allocations as (
                SELECT dc_code, article, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) am
                    JOIN inventory_smart.sku_dc_allocated_units 
                    USING (dc_code, article, size, pack_type_id)
                ) a
                GROUP BY 1, 2
            )
            ,final_inv as (
                SELECT dc_code,
                       article,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       SUM(user_reserve_qty) as user_reserve_qty,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
                FROM (
                     SELECT dc_code,
                            article,
                            SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1, 2
                ) foo
                LEFT JOIN current_allocation USING (dc_code, article)
                LEFT JOIN reserve_allocation USING (dc_code, article)
                LEFT JOIN other_allocations USING (dc_code, article)
                GROUP BY 1, 2
            )
            $$;
        ELSE
            _final_inv_query = $$
            ,final_inv as (
                SELECT article,
                       dc_code,
                       SUM(allocated_qty) as allocated_qty,
                       AVG(available_qty) as net_available_before_allocation,
                       COALESCE(AVG(available_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                FROM packs_base
                GROUP BY 1, 2
            )
            $$;
        END IF;

        _query_combine := format($$
            ------ PRODUCT VIEW - TABLE DATA
            WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size,
                       (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %3$s
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code, 
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
            ,packs_detail as (
                SELECT article, dc_code, size, channel,
                       SUM(allocated_qty) allocated_qty,
                       SUM(packs_allocated_qty) packs_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty ELSE 0 END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty ELSE 0 END) AS pack_units_allocated,
                       STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_type_id END, ',') AS packs_allocated
                FROM packs_base
                GROUP BY 1, 2, 3, 4
            )
            %4$s
            ,article_level_inv as (
                SELECT dc_code, article, net_available, net_available_before_allocation
                FROM (
                    SELECT article,
                           JSONB_OBJECT_KEYS(pack_dc_allocation)::int as dc_code
                    FROM base_table
                ) foo
                LEFT JOIN final_inv USING(dc_code, article)
                GROUP BY 1, 2, 3, 4
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
            ,aps_table as (
                SELECT article,
                       store_code,
                       SUM(ros) as ros_art,
                       AVG(aps_upd) as aps_art,
                       SUM(demand) as demand_art
                FROM (
                    SELECT article,
                           store_code,
                           size,
                           MAX(ros) as ros,
                           MAX(demand) as demand
                    FROM base_table
                    GROUP BY 1, 2, 3
                ) a
                JOIN aps_split
                USING(article, store_code)
                GROUP BY 1, 2
            )
            ,article_level_base_table as (
                SELECT article,
                       inventory_source,
                       demand_type,
                       SUM(demand) as demand,
                       COUNT( DISTINCT( 
                            CASE WHEN allocated_total > 0 then store_code end)
                       ) as store,
                       SUM(MIN) as MIN,
                       SUM(MAX) as MAX,
                       ROUND(SUM(oh)::numeric, 0) oh,
                       ROUND(SUM(oo)::numeric, 0) oo,
                       ROUND(SUM(it)::numeric, 0) it,
                       ROUND((CASE WHEN SUM(demand_art) = 0 then AVG(aps_art)
                                   ELSE (SUM(demand_art * aps_art) / SUM(demand_art))
                              END)::numeric, 2) as original_aps,
                       ROUND((SUM(demand_art * ros_art) / nullif(SUM(demand_art), 0))::numeric, 2) as forecast_aps,
                       ROUND((CASE WHEN SUM(demand_art) = 0 THEN AVG(wos)
                                   ELSE (SUM(demand * wos) / nullif(SUM(demand), 0))
                              END)::numeric, 2) as target_wos,
                       ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::numeric, 2) as actual_wos,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       COUNT(distinct concat(store_code, size)) as count_store_size
                FROM base_table
                JOIN aps_table
                USING(article, store_code) %2$s
                GROUP BY 1, 2, 3
            )
            SELECT alb.*, ali.*, pd.*, pd.allocated_qty allocated_quantity_size, dcs.name dc, ast.order, paf.*
            FROM article_level_base_table alb
            LEFT JOIN article_level_inv ali USING(article)
            LEFT JOIN packs_detail pd using(article, dc_code)
            LEFT JOIN global.distribution_centres dcs using(dc_code) 
            -- LEFT JOIN global.store_attributes_filter smf using (store_code)
            LEFT JOIN (
                SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, product_description description, color
                FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
            ) paf USING (article, size)
            LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
        $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    END
$function$
;
