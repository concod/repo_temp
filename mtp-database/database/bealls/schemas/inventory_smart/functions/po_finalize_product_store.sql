--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:po_finalize_product_store runOnChange:true stripComments:false splitStatements:false context:po_finalize_product_store labels:po_finalize_product_store
--comment: po_finalize_product_store - intial sync version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store
  * Created by: Renugopal S
  * Created at: 21-July-2022
  * No of input parameter: 2
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
								$6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.finalize_product_store
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
        '20339848');
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
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';

        if ($3 = '') IS FALSE
            then
                _store_filter1 := format($$WHERE store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
            end if;

        _query_combine := format($$
             ------  product store view
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
            ,packs_detail as (
                SELECT article, dc_code, store_code, size, channel,
                       SUM(allocated_qty) allocated_qty,
                       MAX(packs_allocated_qty) packs_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty END) AS pack_units_allocated,
                       STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_type_id END, ',') AS packs_allocated
                FROM packs_base
                GROUP BY 1, 2, 3, 4, 5
            )
            ,packs_base_with_product_code as (
            	SELECT pb.*, paf.product_code
    			FROM packs_base pb
            	LEFT JOIN global.product_attributes_filter paf USING(article, size)
            )      
            ,current_allocation as (
    			SELECT am.dc_code,
    				   size,
                       0 as user_reserve_qty,
    				   SUM(available_qty) oh
    			FROM (
    				SELECT dc_code, size, product_code, channel
    				FROM packs_base_with_product_code
    				GROUP BY 1, 2, 3, 4
    			) am
    			LEFT JOIN inventory_smart.po_master sa  
    			ON am.product_code = sa.product_code and am.dc_code = sa.po_code::text and am.channel = sa.channel
    			GROUP BY 1, 2
    		)
    		,other_allocations as (
    			SELECT po_code dc_code,
    				   size,
    				   SUM(quantity) as allocated_reserve_qty
    			FROM inventory_smart.sku_po_allocations sda 
    			WHERE allocation_code not in ('%1$s', '%2$s')
    			group by 1, 2
    		)
            ,final_inv as (
                SELECT dc_code,
                       size,
                       SUM(allocated_qty) allocated_qty,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       SUM(user_reserve_qty) as user_reserve_qty,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                FROM (
                     SELECT dc_code,
                           size,
                           SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1, 2
                ) foo
                LEFT JOIN current_allocation USING (dc_code, size)
                LEFT JOIN other_allocations USING (dc_code, size)
                GROUP BY 1, 2
            )
            ,dc_available as (
           	    SELECT dc_code,
                       JSON_OBJECT_AGG(size, net_available) eaches_available,
           	 	       '{}'::JSON packs_available
           	    FROM final_inv
                GROUP BY 1
            )
            --select * from final_inv
            --  
            ,store_level_inv as (
                SELECT store_code, dc_code, size, net_available
                FROM (
                    SELECT store_code,
                           size,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                ) foo
                LEFT JOIN final_inv USING(dc_code, size)
                GROUP BY 1, 2, 3, 4
            )
            --select * from store_level_inv
            --  
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
            ,size_level as (
                 SELECT store_code,
                       bt.size,
                       ast.order,
                       SUM(demand) as demand_size,
                       SUM(allocated_total) as allocated_quantity_size,
                       SUM(oh) as oh_size,
                       SUM(oo) as oo_size,
                       SUM(it) as it_size,
                       SUM(min_allocation) as min_allocation_size,
                       SUM(wos_allocation) as wos_allocation_size ,
                       SUM(MIN) as min_size,
                       SUM(MAX) as max_size
                FROM base_table_min_wos bt
                LEFT JOIN (
                    SELECT size, product_code FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
                ) sq USING (size)
                LEFT JOIN inventory_smart.article_status_tag ast using (product_code, channel)
                GROUP BY 1, 2, 3
            )
            SELECT slb.*, sl.*, sli.*, pd.*, sli.dc_code as dc,
                   da.eaches_available,
                   da.packs_available
            FROM store_level_base_table slb
            LEFT JOIN size_level sl USING(store_code)
            LEFT JOIN store_level_inv sli USING(store_code, size)
            LEFT JOIN dc_available da using(dc_code)
            LEFT JOIN packs_detail pd using(dc_code, store_code, size)
            -- LEFT JOIN global.distribution_centres dcs using(dc_code) 
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            %4$s
            $$, $2, $3, _article_filter, _store_filter1);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
 $function$
;