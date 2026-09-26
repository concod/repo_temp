--liquibase formatted sql
--changeset liquibase:finalize_product_store runOnChange:true stripComments:false splitStatements:false context:MTP-28337 labels:MTP-28337
--comment: Handled the type-casting of dc_code column for po case.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
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
          '6_250_FactoryLineRetail_20230626T065521',
         '',
        '26246-R89',
         '',
        'allocated');
      FETCH ALL IN "my_cur";
     commit;
 
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Rego              4 Jul           TO addition
  */
 declare
    _query_combine text;
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
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

        CASE $6
        WHEN 'allocated'
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT dc_code, size, pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
                ,reserve_allocation as (
                    SELECT dc_code, size, size pack_type_id, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code::int dc_code, article, size, channel FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                    USING (dc_code, article, size, channel)
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_allocated_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT dc_code::text dc_code,
                           dcs.name dc,
                           size,
                           AVG(allocated_qty) allocated_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                    FROM (
                         SELECT dc_code::int dc_code,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, size)
                    LEFT JOIN reserve_allocation USING (dc_code, size)
                    LEFT JOIN other_allocations USING (dc_code, size)
                    LEFT JOIN global.distribution_centres dcs using(dc_code) 
                    GROUP BY 1, 2, 3
                )
                ,dc_available as (
           		    SELECT dc_code::text dc_code,
                           JSON_OBJECT_AGG(size, eaches_available) FILTER (WHERE type = 'E') eaches_available,
           		    	   JSON_OBJECT_AGG(pack_type_id, packs_available) FILTER (WHERE type = 'S') packs_available,
                           JSON_OBJECT_AGG(pack_type_id, pack_description) pack_description
           		    FROM (
                        SELECT dc_code, size, pack_type_id, type, pack_description,
                   	           COALESCE(SUM(oh_eaches), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(eaches_allocated), 0) - COALESCE(SUM(user_reserve_qty), 0) eaches_available,
                   	           COALESCE(SUM(oh_packs), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(packs_allocated), 0) packs_available
                        FROM (
                            SELECT dc_code::int dc_code, size, pack_type_id, type, pack_description, SUM(allocated_qty) as allocated_qty
                            FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) foo
                        LEFT JOIN current_allocation USING (dc_code, size, pack_type_id)
                        LEFT JOIN reserve_allocation USING (dc_code, size, pack_type_id)
                        LEFT JOIN other_allocations USING (dc_code, size, pack_type_id)
                        GROUP BY 1, 2, 3, 4, 5
                   ) foo
                   GROUP BY 1
                )
            $$;
        WHEN 'po'
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT a.dc_code, a.size, a.pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    FROM (
                	    SELECT article, dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    LEFT JOIN inventory_smart.sku_po_available_units po
                    ON a.article = po.article AND a.channel = po.channel AND a.dc_code = po.po_code AND a.size = po.size AND a.pack_type_id = po.pack_type_id
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, size, pack_type_id, channel)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT dc_code,
                           dc_code dc,
                           size,
                           AVG(allocated_qty) allocated_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) as net_available
                    FROM (
                         SELECT dc_code,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, size)
                    LEFT JOIN other_allocations USING (dc_code, size)
                    GROUP BY 1, 2, 3
                )
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, eaches_available) FILTER (WHERE type = 'E') eaches_available,
           		    	   JSON_OBJECT_AGG(pack_type_id, packs_available) FILTER (WHERE type = 'S') packs_available,
                           JSON_OBJECT_AGG(pack_type_id, pack_description) pack_description
           		    FROM (
                        SELECT dc_code, size, pack_type_id, type, pack_description,
                   	           COALESCE(SUM(oh_eaches), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(eaches_allocated), 0) eaches_available,
                   	           COALESCE(SUM(oh_packs), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(packs_allocated), 0) packs_available
                        FROM (
                            SELECT dc_code, size, pack_type_id, type, pack_description, SUM(allocated_qty) as allocated_qty
                            FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) foo
                        LEFT JOIN current_allocation USING (dc_code, size, pack_type_id)
                        LEFT JOIN other_allocations USING (dc_code, size, pack_type_id)
                        GROUP BY 1, 2, 3, 4, 5
                   ) foo
                   GROUP BY 1
                )
            $$;
        ELSE
            _final_inv_query := $$
        		,final_inv as (
        		    SELECT a.dc_code,
                           coalesce(dcs.name, a.dc_code) dc,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		       	   COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
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
                    LEFT JOIN global.distribution_centres dcs on a.dc_code = dcs.dc_code::text
					GROUP BY 1, 2, 3
        		)
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, available_qty) FILTER (WHERE type = 'E') eaches_available,
           		    	   JSON_OBJECT_AGG(pack_type_id, available_qty) FILTER (WHERE type = 'S') packs_available,
                           JSON_OBJECT_AGG(pack_type_id, pack_description) pack_description
           		    FROM (
                        SELECT dc_code, size, pack_type_id, pack_description, type, AVG(available_qty) - SUM(allocated_qty) available_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                   ) foo
                   GROUP BY 1
                )
            $$;
        END CASE;

        _query_combine := format($$
             ------  product store view
            WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %2$s
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
                       parent_article pack_description,
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
                       pack_type_id as pack_description,
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
                       pack_description,
                       size,
                       allocated_qty,
                       channel,
                       available_qty,
                       packs_allocated_qty,
                       'S' as type
               FROM packs
            )
            ,packs_detail as (
                SELECT article, dc_code, store_code, size, channel,
                       SUM(allocated_qty) allocated_qty,
                       JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) FILTER (WHERE type = 'S') packs_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty END) AS pack_units_allocated,
                       STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_description END, ',') AS packs_allocated
                FROM packs_base
                GROUP BY 1, 2, 3, 4, 5
            )
            %4$s
            ,store_level_inv as (
                SELECT store_code, dc_code, dc, size, net_available
                FROM (
                    SELECT store_code,
                           size,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                ) foo
                LEFT JOIN final_inv USING(dc_code, size)
                GROUP BY 1, 2, 3, 4, 5
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
                       store_grade,
                       order_type,
                       demand_type,
                       max(date(delivery_dt)) delivery_dt,
                       ROUND(AVG(aps_upd)::NUMERIC, 2) as original_aps,
                       ROUND(SUM(ros)::NUMERIC, 2) as forecast_aps,
                       SUM(oh) as oh,
                       SUM(oo) as oo,
                       SUM(it) as it,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                    --   ROUND((SUM(demand * wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as target_wos,
                    --   ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::NUMERIC, 2) as actual_wos,
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
                           order_type,
                           delivery_dt,
                           MAX(demand) demand,
                           MAX(MIN) MIN,
                           MAX(MAX) MAX,
                           SUM(min_allocation) as min_allocation,
                           SUM(wos_allocation) as wos_allocation,
                           MAX(ros) ros,
                           MAX(COALESCE(oh, 0)) oh,
                           MAX(COALESCE(oo, 0)) oo,
                           MAX(COALESCE(it, 0)) it,
                           MAX(oh_oo_intransit) oh_oo_intransit,
                           MAX(wos) wos,
                           SUM(allocated_total) allocated_total,
                           ((SUM(allocated_total) + MAX(oh_oo_intransit)) / nullif(MAX(ros), 0)) as current_wos
                    FROM base_table_min_wos bt
                    GROUP BY 1, 2, 3, 4, 5, 6, 7
                ) as st
                JOIN aps_split aps USING(article, store_code)
                LEFT JOIN (
                    SELECT article, COUNT(distinct size) as size_count
                    FROM base_table_min_wos
                    GROUP BY 1
                ) as artdet
                USING(article)
                GROUP BY 1, 2, 3, 4
            )
            ,size_level as (
                 SELECT store_code,
                       bt.size,
                       ast.order,
                       product_code,
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
                GROUP BY 1, 2, 3, 4
            ),
            to_data as ( 
            	select 
					to_id,
					product_code,
					shipping_date,
					receipt_date,
					invent_location_id_to,
					quantity_transferred as size_value_quantity_transferred,
					quantity_received as size_value_quantity_received,
					quantity_remain_received as size_value_quantity_remain_received,
					quantity_shipped as size_value_quantity_shipped,
					quantity_remain_shipped as size_value_quantity_remain_shipped
            	from inventory_smart.to_master tm2 
                WHERE allocation_code = '%1$s' 
            )
            --select * from to_data;
            ,inventory_stats as (
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
            )
            SELECT slb.*, sl.*,
                   sli.dc_code,
                   sli.dc,
            	   sli.net_available,
                   pd.allocated_qty,
                   pd.packs_allocated_qty,
                   pd.loose_units_allocated,
                   pd.pack_units_allocated,
                   pd.packs_allocated,
                   smf.store_name,
                   da.eaches_available,
                   da.packs_available,
                   da.pack_description,
                   ii.*,
                   td.*,
                   asg.grade,
                   district,
                   state,
                   climate
            FROM store_level_base_table slb
            LEFT JOIN size_level sl USING(store_code)
            LEFT JOIN store_level_inv sli USING(store_code, size)
            LEFT JOIN dc_available da using(dc_code)
            LEFT JOIN packs_detail pd using(dc_code, store_code, size)
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            LEFT JOIN inventory_stats ii using (store_code)
            left join to_data td on sl.product_code = td.product_code and td.invent_location_id_to = sl.store_code
            left join inventory_smart.article_store_grade asg using(article, store_code)
            %3$s
            ORDER BY sl.order
            $$, $2, _article_filter, _store_filter1, _final_inv_query, $4);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
 $function$
;
