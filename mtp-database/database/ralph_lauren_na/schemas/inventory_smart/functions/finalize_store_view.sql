--liquibase formatted sql
--changeset  konakandla.sujan@impactanalytics.co:modify_original_available_formula_finalize_allocation runOnChange:true stripComments:false splitStatements:false context:MTP-56390 labels:MTP-56390
--comment: MTP-56390, fixed original_available for finalized allocation calc, MTP-56390, sku_dc_reserved_units -> sku_dc_reserved_units_no_purge, performance change sync,MTP-98417
--rollback: SELECT
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(input refcursor, character varying, character varying);
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
          '6_155_PFS_20230519T071512',
          '',
          '',
          '');--VP
      FETCH ALL IN "my_cur";
     commit;
  *
      begin;
     select * from inventory_smart.finalize_store_view
         ('my_cur',
          '6_155_PFS_20230519T071512',
          '',
          '',
          'allocated');
      FETCH ALL IN "my_cur";
     commit;
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * shreyan.haldankar 2024-09-12    MTP-56390, fixed original_available for finalized allocation calc
  */
declare
    _query_combine text;
    _allocation_code_without_edit text;
    _article_filter text;
    _final_inv_query text;
    _article_filter2 text;
    _created_at timestamp;
    begin
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
            _article_filter2 = format($$WHERE article IN ('%s')$$, $4);
        END IF;
        IF ($5 = 'allocated')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT dc_code, SUM(oh) oh
                    FROM (
                    	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                    ) a
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING(article, dc_code)
                    GROUP BY 1
                )
                ,reserve_allocation as (
                    SELECT dc_code, SUM(user_reserve_qty) user_reserve_qty
                        FROM (
                        SELECT dc_code, SUM(COALESCE(quantity,0)) user_reserve_qty
                          FROM (
                            SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                          ) am
                        LEFT JOIN (
                            SELECT * FROM inventory_smart.sku_dc_reserved_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                        ) b
                        USING (dc_code, article)
                        GROUP BY 1
                    ) sq
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article)
                        GROUP BY 1, 2, 3
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                  SELECT dc_code::text,
                  CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                       THEN 0
                       ELSE COALESCE(oh, 0) - COALESCE(user_reserve_qty, 0) - COALESCE(allocated_reserve_qty, 0)
                   END as net_available,
                   CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                       THEN 0
                       ELSE COALESCE(oh, 0) - COALESCE(user_reserve_qty, 0) - COALESCE(allocated_reserve_qty, 0)
                  END as original_available
                  FROM current_allocation JOIN reserve_allocation using(dc_code) JOIN other_allocations using(dc_code)
                )
            $$;
ELSIF ($5 = 'reserved')
        THEN
			_final_inv_query := $$
                ,reserve_allocation as (
                    SELECT dc_code, SUM(user_reserve_qty) user_reserve_qty
                        FROM (
                        SELECT dc_code, SUM(COALESCE(quantity,0)) user_reserve_qty
                          FROM (
                            SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                          ) am
                        LEFT JOIN (
                            SELECT * FROM inventory_smart.sku_dc_reserved_units_no_purge('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                        ) b
                        USING (dc_code, article)
                        GROUP BY 1
                    ) sq
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article)
                        GROUP BY 1, 2, 3
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                  select dc_code::text, COALESCE(user_reserve_qty, 0) as net_available,
                  COALESCE(user_reserve_qty, 0) as original_available
                  FROM reserve_allocation JOIN other_allocations using(dc_code)
                )
            $$;
        ELSIF ($5 = 'po')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT pb.dc_code, SUM(spau.oh) oh
                    FROM (
                    	SELECT article, dc_code, channel FROM packs_base GROUP BY 1, 2, 3
                    ) pb
                    LEFT JOIN inventory_smart.sku_po_available_units spau
                    ON pb.article = spau.article AND pb.channel = spau.channel AND pb.dc_code = spau.po_code
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code, channel FROM packs_base GROUP BY 1, 2, 3
                        ) am
                        LEFT JOIN inventory_smart.sku_po_allocated_units
                        USING (dc_code, article, channel)
                        GROUP BY 1, 2, 3
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                  SELECT dc_code,
                  COALESCE(oh, 0)  - COALESCE(allocated_reserve_qty, 0) as net_available,
                  COALESCE(oh, 0)  - COALESCE(allocated_reserve_qty, 0) as original_available
                  FROM current_allocation JOIN other_allocations using(dc_code)
                )
            $$;
        ELSE
            _final_inv_query := $$
        		,final_inv as (
        		    SELECT
        		        dc_code::text,
        		        CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                            THEN 0
                            ELSE COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)
                        END  as net_available,
                        COALESCE(SUM(available_qty), 0) as original_available
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
        		    group by dc_code
        		)
            $$;
        END IF;
        _allocation_code_without_edit := REPLACE($2, 'edit_', '');
        _query_combine := format($$
            ------ STORE VIEW TABLE DATA
            WITH
            -- created as (
            --             select (created_at::date)::timestamp from inventory_smart.plan_master pm
            --             WHERE plan_code = REPLACE('%1$s', 'edit_', '')
            -- )
            -- ,
            base_table as materialized (
                SELECT carfs.*, channel, store store_code, retail_size_cd size FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                where carfs.created_at between '%5$s'::timestamp and '%6$s'::timestamp
                and allocation_code = '%1$s'
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
                    %7$s
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
            ,sales_store_level as (
	            SELECT
	            	store_code,
	            	ROUND(SUM(lw_qty)::numeric, 2) lw_qty, --articles summed
	           		ROUND(SUM(lw_revenue)::int, 2) as lw_revenue,
                    ROUND(SUM(lw2_qty)::numeric, 2) lw2_qty,
                    ROUND(SUM(lw3_qty)::numeric, 2) lw3_qty,
                    ROUND(SUM(lw4_qty)::numeric, 2) lw4_qty,
                    ROUND(SUM(lw5_qty)::numeric, 2) lw5_qty,
                    ROUND(SUM(lw6_qty)::numeric, 2) lw6_qty
	           	FROM (
					SELECT article,
						   store_code,
						   AVG(aid.lw_qty) as lw_qty,--size  avg
						   AVG(aid.lw_revenue) as lw_revenue,
                           AVG(aid.sales_2_ago) as lw2_qty,
                           AVG(aid.sales_3_ago) as lw3_qty,
                           AVG(aid.sales_4_ago) as lw4_qty,
                           AVG(aid.sales_5_ago) as lw5_qty,
                           AVG(aid.sales_6_ago) as lw6_qty
					FROM packs_base
					LEFT JOIN inventory_smart.article_inventory_dashboard aid using(article, store_code)
					GROUP BY 1, 2
				) al
				GROUP BY 1
            )
           -- select * from sales_store_level;
            %4$s
            ,base_table_min_wos AS (
                SELECT b.*,
                       GREATEST(0, MIN - (updated_oh_oo_it)) as min_short,
                       GREATEST(0, allocated_total - GREATEST(0, MIN - (updated_oh_oo_it))) as wos_allocation,
                       LEAST(allocated_total, GREATEST(0, MIN - (updated_oh_oo_it))) as min_allocation
                FROM base_table b
                %7$s
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
                      %7$s
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
                            %7$s
                        GROUP BY 1, 2
                        ) as b
                    GROUP BY 1
                  ) as c
                USING(article)
            )
            ,store_level_base_table as (
                SELECT store_code,
                      -- store_grade, -- store grade is at article - store level rather than just store
                      -- order_type,
                       delivery_dt,
                       ROUND(AVG(lw_qty)::int, 2) as lw_qty,
                       ROUND(AVG(lw_revenue)::int, 2) as lw_revenue,
                       ROUND(AVG(lw2_qty)::int, 2) as lw2_qty,
                       ROUND(AVG(lw3_qty)::int, 2) as lw3_qty,
                       ROUND(AVG(lw4_qty)::int, 2) as lw4_qty,
                       ROUND(AVG(lw5_qty)::int, 2) as lw5_qty,
                       ROUND(AVG(lw6_qty)::int, 2) as lw6_qty,
                       ROUND(AVG(aps_upd)::NUMERIC, 2) as original_aps,
                       ROUND(SUM(ros)::NUMERIC, 2) as forecast_aps,
                       SUM(oh) as oh,
                       SUM(oo) as oo,
                       SUM(it) as it,
                       SUM(MIN) as "min",
                       SUM(MAX) as "max",
                       SUM(lt_forecast) lt_forecast,
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
                        COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN st.article END)) as style_color_cnt
                FROM (
                    SELECT article,
                           store_code,
                        --   store_grade,
                           size,
                           demand_type,
                         --  order_type,
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
                           MAX(lt_forecast) lt_forecast,
                           MAX(oh_oo_intransit) oh_oo_intransit,
                           MAX(wos) wos,
                           SUM(allocated_total) allocated_total,
                           ((SUM(allocated_total) + MAX(oh_oo_intransit)) / nullif(MAX(ros), 0)) as current_wos
                    FROM base_table_min_wos bt
                    GROUP BY 1, 2, 3, 4, 5--, 6--, 7
                ) as st
                JOIN aps_split aps USING(article, store_code)
                LEFT JOIN (
                    SELECT article, COUNT(distinct size) as size_count
                    FROM base_table_min_wos
                    GROUP BY 1
                ) as artdet
                USING(article)
                left join sales_store_level ssl using(store_code)
                GROUP BY 1, 2--, 3--, 4
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
                           GREATEST(0, COALESCE(allocated_total, 0) - GREATEST(0, MIN - (oh + it + oo))) as wos_allocation,
                           LEAST(COALESCE(allocated_total, 0), GREATEST(0, MIN - (oh + it + oo))) as min_allocation
                    FROM (
                        SELECT *
                        FROM (
                            SELECT article, store_code, size, channel, min, oh, it, oo, JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                            FROM base_table
                            %7$s
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
            ,shipping_date as (
                SELECT store_code, dc_data.key dc_code, dc_data.value::text as shipping_date
                FROM (
                    SELECT store_data.key as store_code, store_data.value::json as dc_data
                    FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
                    WHERE plan_code = '%2$s'  and attribute_name = 'shipping_date'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,cancel_date as (
                SELECT store_code, dc_data.key dc_code, dc_data.value::text as cancel_date

                FROM (
                    SELECT store_data.key as store_code, store_data.value::json as dc_data
                    FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
                    WHERE plan_code = '%2$s'  and attribute_name = 'cancel_date'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,store_priorities as (
                SELECT store_code, dc_data.key dc_code, dc_data.value::text as priority_code
                FROM (
                    SELECT store_data.key as store_code, store_data.value::json as dc_data
                    FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT((a.attribute_value::JSON)->'store_priorities') as store_data
                    WHERE plan_code = '%2$s' AND attribute_name = 'store_level_data'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,dc_data as (
                SELECT dc_code, name,
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
            SELECT sl.* , dl.*, COALESCE(dcs.name, dl.dc_code::character varying) dc, net_available, original_available, smf.store_name, store_code store, smf.retail_facility_code store_id,
                   COALESCE(sd.shipping_date, TO_CHAR(Date(now()), 'MM-DD-YYYY')) as shipping_date,
                   COALESCE(cd.cancel_date, TO_CHAR(Date(now() + interval '30 day'), 'MM-DD-YYYY')) as cancel_date,
                   COALESCE(sp.priority_code, CASE WHEN smf.channel = 'RLS' THEN 'W' ELSE 'S' END) priority_code
            FROM store_level_base_table sl
            LEFT JOIN dc_level_min_wos dl USING(store_code)
            LEFT JOIN shipping_date sd using(store_code, dc_code)
            LEFT JOIN cancel_date cd using(store_code, dc_code)
            LEFT JOIN store_priorities sp USING (dc_code, store_code)
            LEFT JOIN dc_data dcs on dcs.dc_code::text = dl.dc_code
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            JOIN final_inv fi on fi.dc_code = dl.dc_code
        $$, $2, _allocation_code_without_edit, _article_filter, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes',_article_filter2);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
$function$
;
