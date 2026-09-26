--liquibase formatted sql
--changeset liquibase:finalize_product_view runOnChange:true stripComments:false splitStatements:false context:MTP-38865-2 labels:MTP-28337
--comment: $ Handled the type-casting of dc_code column for po case.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
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
  * 							$3 = Store code
  * 							$4 = Ignore allocation codes
								$5 = article filter
                                $6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
 
     begin;
     select * from inventory_smart.finalize_product_view
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
         '',
         '',
         'allocated');
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
        _store_filter1 text;
    begin
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$WHERE store_code = '%s'$$, $3);
                _store_filter1 := format($$AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $5);
        END IF;
        if ($3 = '') IS TRUE
            then
                _store_filter1 := format($$AND store_code in (select distinct store_code from base_table)$$, $3);
            end if;

        CASE $6
        WHEN 'allocated'
        THEN
            _final_inv_query := $$
            ,current_allocation as (
                SELECT dc_code, article, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                FROM (
                	SELECT article, dc_code::int dc_code, channel FROM packs_base
                    GROUP BY 1, 2, 3
                ) a 
				LEFT JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code)
                GROUP BY 1, 2
            )
            ,reserve_allocation as (
                SELECT dc_code, article, MAX(COALESCE(quantity,0)) user_reserve_qty 
                FROM (
                    SELECT dc_code::int dc_code, article, channel FROM packs_base
                    GROUP BY 1, 2, 3
                ) am
                LEFT JOIN inventory_smart.sku_dc_reserved_units sdru USING (dc_code, article, channel)
                GROUP BY 1, 2
            )
            ,other_allocations as (
                SELECT dc_code, article, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, channel, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                    	SELECT article, dc_code::int dc_code, channel FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    JOIN inventory_smart.sku_dc_allocated_units USING (dc_code, article, channel)
                ) a
                GROUP BY 1, 2
            )
            ,final_inv as (
                SELECT dc_code::text dc_code,
                       article,
                       dcs.name dc,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       SUM(user_reserve_qty) as user_reserve_qty,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
                FROM (
                     SELECT dc_code::int dc_code,
                            article,
                            SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1, 2
                ) foo
                LEFT JOIN current_allocation USING (dc_code, article)
                LEFT JOIN reserve_allocation USING (dc_code, article)
                LEFT JOIN other_allocations USING (dc_code, article)
                LEFT JOIN global.distribution_centres dcs using(dc_code) 
                GROUP BY 1, 2, 3
            )
            $$;
        WHEN 'po'
        THEN
            _final_inv_query := $$
            ,current_allocation as (
                SELECT a.dc_code, a.article, SUM(oh) oh
                FROM (
                	SELECT article, dc_code, channel FROM packs_base
                    GROUP BY 1, 2, 3
                ) a 
                LEFT JOIN inventory_smart.sku_po_available_units po
                ON a.article = po.article AND a.channel = po.channel AND a.dc_code = po.po_code
                GROUP BY 1, 2
            )
            ,other_allocations as (
                SELECT dc_code, article, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, channel, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                    	SELECT article, dc_code, channel FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, channel)
                ) a
                GROUP BY 1, 2
            )
            ,final_inv as (
                SELECT dc_code,
                       article,
                       dc_code dc,
                       SUM(oh) as dc_available,
                       SUM(allocated_reserve_qty) as allocated_reserve_qty,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available,
                       COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) as net_available_before_allocation
                FROM (
                     SELECT dc_code,
                            article,
                            SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    GROUP BY 1, 2
                ) foo
                LEFT JOIN current_allocation USING (dc_code, article)
                LEFT JOIN other_allocations USING (dc_code, article)
                GROUP BY 1, 2
            )
            $$;
        ELSE
            _final_inv_query = $$
            , packs_base_grouped as (
            	select 
					article,
	            	size,
	            	dc_code,
	            	pack_type_id,
	            	SUM(allocated_qty) as allocated_qty,
	            	avg(available_qty) as available_qty
				from packs_base
				group by 1,2,3,4
			)
            ,final_inv as (
                SELECT article,
                       pb.dc_code,
                       COALESCE(dcs.name, pb.dc_code)as dc,
                       SUM(allocated_qty) as allocated_qty,
                       SUM(available_qty) as net_available_before_allocation,
                       COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                FROM packs_base_grouped pb
                LEFT JOIN global.distribution_centres dcs on pb.dc_code = dcs.dc_code::text
                GROUP BY 1, 2, 3
            )
            $$;
        END CASE;

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
            ,packs_detail as (
                SELECT article, dc_code, size, channel, store_code,
                       SUM(allocated_qty) allocated_qty,
                       SUM(packs_allocated_qty) packs_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty ELSE 0 END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty ELSE 0 END) AS pack_units_allocated,
                       STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_type_id END, ',') AS packs_allocated
                FROM packs_base %2$s
                GROUP BY 1, 2, 3, 4, 5
            )
            ,pack_description AS (
                SELECT article,
                	   STRING_AGG(DISTINCT parent_article, ',') AS parent_article,
                	   STRING_AGG(DISTINCT pack_description, ',') AS pack_description
                FROM (
                	SELECT article, pack_type_id 
                	FROM packs_base
                	WHERE type = 'S'
                ) a
                LEFT JOIN inventory_smart.dc_pack_configuration USING(article, pack_type_id)
                GROUP BY 1
            )
            %4$s
            ,article_level_inv as (
                SELECT dc_code, dc, article, net_available, net_available_before_allocation
                FROM (
                    SELECT article,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                ) foo
                LEFT JOIN final_inv USING(dc_code, article)
                GROUP BY 1, 2, 3, 4, 5
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
                    --   ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::numeric, 2) as actual_wos,
                       
				       (CASE 
				        WHEN SUM(demand) > 0 
				            THEN ROUND((SUM(demand * current_wos) / SUM(demand))::NUMERIC, 2)
				        ELSE 
				            SUM(current_wos)::numeric
				        END ) as actual_wos,
				        
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       SUM(oh_oo_intransit) as oh_oo_intransit,
                       COUNT(distinct store_code) as count_store_size
                FROM base_table
                JOIN aps_table
                USING(article, store_code) %2$s
                GROUP BY 1, 2, 3
            )
            SELECT alb.*, ali.*, pd.*, pd.allocated_qty allocated_quantity_size, ast.order, ast.article_status_tag , paf.*, aid.* , dpc.parent_article, dpc.pack_description,
            coalesce(u.factor, 1) as case_pack_qty
           -- , asg.grade,
           -- smf.district, smf.state , smf.climate
            FROM article_level_base_table alb
            LEFT JOIN article_level_inv ali USING(article)
            LEFT JOIN packs_detail pd using(article, dc_code)
            LEFT JOIN (
                SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, product_description description, color, launch_date, color_code, style, selling_collection, fabrication
                FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
            ) paf USING (article, size)
            LEFT JOIN (
                SELECT article,
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
                FROM (SELECT article from base_table GROUP BY 1) a
                LEFT JOIN (
                    SELECT * FROM inventory_smart.article_inventory_dashboard aid
                    WHERE article in (SELECT distinct article from base_table) %5$s
                ) b USING(article)
                GROUP BY article
            ) aid using (article)
            LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
            LEFT JOIN pack_description dpc on dpc.article = paf.article
            left join inventory_smart.uom u on paf.style = u.item_id
            ORDER BY ast.order
           -- left JOIN global.store_attributes_filter smf  on smf.store_code=pd.store_code 
           -- left join inventory_smart.article_store_grade asg on asg.article = alb.article and asg.store_code = pd.store_code 
        $$, $2, _store_filter, _article_filter, _final_inv_query, _store_filter1);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    END
$function$
;
