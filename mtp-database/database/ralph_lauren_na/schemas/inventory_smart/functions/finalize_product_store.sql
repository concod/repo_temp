--liquibase formatted sql
--changeset surya.kuruvadi@impactanalytics.co:MTP-113480 runOnChange:true stripComments:false splitStatements:false context:MTP-113480 labels:MTP-21190 revert ,MTP-94367, MTP-113480
--comment: MTP-94367 optimize sku_dc_allocated_units using SP function and materialize it and added is_deleted filter,MTP-98417, MTP-113480
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
    _final_inv_query text;
    _priority_allocation text;
    _article_filter2 text;
    _created_at timestamp;
   _l0_name varchar;
    begin
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
        select attribute_value into _l0_name from inventory_smart.plan_attributes pm WHERE plan_code = REPLACE($2, 'edit_', '') and attribute_name = 'l0_name';
        raise notice '_l0_name: %', _l0_name;
        _store_filter1 := '';
        _article_filter := '';
        _article_filter2 := '';
        _store_filter2 := '';
        _priority_allocation := '';

        IF $5 = '' then
       		_priority_allocation = $2;
    	else
    		_priority_allocation = $5;
    	END IF;

        if ($3 = '') IS FALSE
            then
                _store_filter1 := format($$WHERE store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
                _article_filter2 := format($$WHERE article = '%s'$$, $4);
            end if;

        IF ($6 = 'allocated')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT article, dc_code, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, size, dc_code::int FROM packs_base GROUP BY 1, 2, 3
                    ) a
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING(article, dc_code, size)
                    GROUP BY 1, 2, 3
                )
                ,reserve_allocation as (
                    SELECT article, dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code::int, article, size FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code::int, article, pack_type_id, size FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) am
                        JOIN sku_dc_allocated_units b
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           article,
                           size,
                           CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0)
                           END as net_available,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
                    FROM (
                         SELECT dc_code::int,
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
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           dcs.name dc,
                           size,
                           SUM(net_available) net_available,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    LEFT JOIN global.distribution_centres dcs using(dc_code)
                    GROUP BY 1, 2, 3
                )
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, net_available) eaches_available,
           		    	   '{}'::JSON packs_available
           		    FROM final_inv
                    GROUP BY 1
                )
            $$;
        ELSIF ($6 = 'reserved')
        THEN
			_final_inv_query := $$
                ,reserve_allocation as (
                    SELECT article, dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code::int, article, size FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units_no_purge('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code::int, article, pack_type_id, size FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) am
                        JOIN sku_dc_allocated_units b
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           dcs.name dc,
                           article,
                           size,
                           COALESCE(SUM(user_reserve_qty), 0)-COALESCE(SUM(allocated_qty), 0) as net_available,
                           COALESCE(SUM(user_reserve_qty), 0) - COALESCE(SUM(allocated_reserve_qty), 0)  as net_available_before_allocation
                    FROM (
                         SELECT dc_code::int,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN reserve_allocation USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size)
                    LEFT JOIN global.distribution_centres dcs using(dc_code)
                    GROUP BY 1, 2, 3, 4
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           dcs.name dc,
                           size,
                           SUM(net_available) net_available,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    LEFT JOIN global.distribution_centres dcs using(dc_code)
                    GROUP BY 1, 2, 3
                )
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, net_available) eaches_available,
           		    	   '{}'::JSON packs_available
           		    FROM final_inv
                    GROUP BY 1
                )
            $$;
        ELSIF ($6 = 'po')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT pb.article, pb.dc_code, pb.size, SUM(spau.oh) oh
                    FROM (
                        SELECT article, size, dc_code, channel FROM packs_base GROUP BY 1, 2, 3, 4
                    ) pb
                    LEFT JOIN inventory_smart.sku_po_available_units spau
                    ON pb.article = spau.article AND pb.size = spau.size AND pb.channel = spau.channel AND pb.dc_code = spau.po_code
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size, channel FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) am
                        JOIN inventory_smart.sku_po_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           article,
                           size,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) as net_available_before_allocation
                    FROM (
                         SELECT dc_code,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT dc_code,
                           dc_code dc,
                           size,
                           SUM(net_available) net_available,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1, 2, 3
                )
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, net_available) eaches_available,
           		    	   '{}'::JSON packs_available
           		    FROM final_inv
                    GROUP BY 1
                )
            $$;
        ELSE
            _final_inv_query := $$
        		,final_inv as (
        		    SELECT a.dc_code::text,
        		           coalesce(dcs.name, a.dc_code::text) dc,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		           CASE WHEN a.dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)
        		       	   END as net_available,
                           0 min_net_available
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
        		    LEFT JOIN global.distribution_centres dcs on dcs.dc_code::text=a.dc_code
					GROUP BY 1, 2, 3
        		)
                ,dc_available as (
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, net_available_qty) FILTER (WHERE type = 'E') eaches_available,
           		    	   JSON_OBJECT_AGG(pack_type_id, net_available_qty) FILTER (WHERE type = 'S') packs_available
           		    FROM (
                        SELECT dc_code, size, pack_type_id, type,CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
        		       	   THEN 0
                   	       ELSE coalesce(sum(available_qty), 0) - coalesce(sum(allocated_qty), 0)
                   	       END as net_available_qty
                        FROM (
                            SELECT dc_code, size, pack_type_id, type, max(available_qty) available_qty, sum(allocated_qty) allocated_qty
                            FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) bar
                        GROUP BY 1, 2, 3, 4
                   ) foo
                   GROUP BY 1
                )
            $$;
        END IF;

        _query_combine := format($$
             ------  product store view
            WITH
            -- created as (
            --     select (created_at::date)::timestamp from inventory_smart.plan_master pm
            --     WHERE plan_code = REPLACE('%1$s', 'edit_', '')
            -- )
            -- ,
            base_table as materialized(
                SELECT carfs.*, channel, store store_code, retail_size_cd size FROM
                (
                    select * from inventory_smart.create_allocation_result_flat_gurobi carfs
                     where carfs.created_at between '%7$s'::timestamp and '%8$s'::timestamp
                ) carfs
                JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                WHERE allocation_code = '%1$s'
            )
            ,sku_dc_allocated_units as materialized (
                select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ )
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
                    %9$s
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
            ,packs_base as materialized(
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
            ,sales_article_store_level as (
				SELECT  store_code,
						COALESCE(round(avg(aid.lw_qty)::numeric, 2), 0) AS lw_qty,
                        COALESCE(round(avg(aid.lw_revenue)::Decimal, 2), 0) AS lw_revenue,
                        COALESCE(round(avg(aid.sales_2_ago)::numeric,2), 0) AS lw2_qty,
                        COALESCE(round(avg(aid.sales_3_ago)::numeric,2), 0) AS lw3_qty,
                        COALESCE(round(avg(aid.sales_4_ago)::numeric,2), 0) AS lw4_qty,
                        COALESCE(round(avg(aid.sales_5_ago)::numeric,2), 0) AS lw5_qty,
                        COALESCE(round(avg(aid.sales_6_ago)::numeric,2), 0) AS lw6_qty
				FROM packs_base
				LEFT JOIN inventory_smart.article_inventory_dashboard aid using(article, store_code)
                %3$s
				GROUP BY 1
            )
           -- select * from sales_store_level;
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
            %4$s
            ,store_level_inv as (
                SELECT store_code, dc_code, dc,  size, net_available, min_net_available
                FROM (
                    SELECT store_code,
                           size,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                    %9$s
                ) foo
                JOIN final_inv USING(dc_code, size)
                GROUP BY 1, 2, 3, 4, 5, 6
            )
            --select * from store_level_inv
            --  ,dc_priority_ordering as (
			-- 	select store_code, dc_code, dc_rank
			-- 	from
			-- 		"global".product_mapping_store_dc
			-- 	join inventory_smart.dc_transit_time_mapping dtm
			-- 	using (mapping_code)
			-- 	where (store_code, dc_code)
            --         in ( select store_code, dc_code from store_level_inv)
			-- )
            ,base_table_min_wos AS (
                SELECT b.*,
                       GREATEST(0, MIN - (updated_oh_oo_it)) as min_short,
                       GREATEST(0, allocated_total - GREATEST(0, MIN - (updated_oh_oo_it))) as wos_allocation,
                       LEAST(allocated_total, GREATEST(0, MIN - (updated_oh_oo_it))) as min_allocation
                FROM base_table b
                %9$s
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
                      %9$s
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
                            %9$s
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
                       delivery_dt,
                       ROUND(AVG(aps_upd)::NUMERIC, 2) as original_aps,
                       ROUND(SUM(ros)::NUMERIC, 2) as forecast_aps,
                       SUM(oh) as oh,
                       sum(original_forecast) original_forecast,
                       sum(constrained_forecast) constrained_forecast,
                       SUM(oo) as oo,
                       SUM(it) as it,
                       sum(min) as min_store,
                       sum(max) as max_store,
                       SUM(lt_forecast) as lt_forecast,
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
                           store_grade,
                           size,
                           demand_type,
                           order_type,
                           delivery_dt,
                           original_forecast,
						   constrained_forecast,
                           COALESCE(MAX(demand), 0) demand,
                           COALESCE(MAX(MIN), 0) MIN,
                           COALESCE(MAX(MAX), 0) MAX,
                           COALESCE(SUM(min_allocation), 0) as min_allocation,
                           COALESCE(SUM(wos_allocation), 0) as wos_allocation,
                           COALESCE(MAX(ros), 0) ros,
                           COALESCE(MAX(oh), 0) oh,
                           COALESCE(MAX(oo), 0) oo,
                           COALESCE(MAX(it), 0) it,
                           COALESCE(MAX(lt_forecast), 0) lt_forecast,
                           COALESCE(MAX(oh_oo_intransit), 0) oh_oo_intransit,
                           COALESCE(MAX(wos), 0) wos,
                           COALESCE(SUM(allocated_total), 0) allocated_total,
                           ((SUM(allocated_total) + MAX(oh_oo_intransit)) / nullif(MAX(ros), 0)) as current_wos
                    FROM base_table_min_wos bt
                    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
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
            ,store_priorities as (
                SELECT article, dc_data.key store_code, (json_each_text(dc_data.value::json)).key as dc_code, (json_each_text(dc_data.value::json)).value as priority_code
                    FROM (
                        SELECT product_store_data.key as article, product_store_data.value::json as store_code, product_store_data.value::json as dc_data
                        FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT((a.attribute_value::JSON)->'product_store_priorities') as product_store_data
                        WHERE plan_code = '%5$s' AND attribute_name = 'product_level_data'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,mat_level_shipping_date as (
                SELECT article, dc_data.key store_code, (json_each_text(dc_data.value::json)).key as dc_code, (json_each_text(dc_data.value::json)).value as shipping_date
                    FROM (
                        SELECT product_store_data.key as article, product_store_data.value::json as store_code, product_store_data.value::json as dc_data
                        FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT((a.attribute_value::JSON)->'shipping_date') as product_store_data
                        WHERE plan_code = '%5$s' AND attribute_name = 'product_level_data'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,size_level as (
                 SELECT store_code,
                       bt.size,
                       COALESCE(ast.order, 999) as order,
                       COALESCE(SUM(demand), 0) as demand_size,
                       COALESCE(SUM(allocated_total), 0) as allocated_quantity_size,
                       COALESCE(SUM(oh), 0) as oh_size,
                       COALESCE(SUM(oo), 0) as oo_size,
                       COALESCE(SUM(it), 0) as it_size,
                       COALESCE(SUM(min_allocation), 0) as min_allocation_size,
                       COALESCE(SUM(wos_allocation), 0) as wos_allocation_size ,
                       COALESCE(SUM(MIN), 0) as min_size,
                       COALESCE(SUM(MAX), 0) as max_size
                FROM base_table_min_wos bt
                LEFT JOIN (
                    SELECT size, product_code FROM global.product_attributes_filter paf WHERE l0_name =any('%10$s'::varchar[]) and article in (SELECT distinct article from base_table %9$s) and (active and (not is_deleted))
                ) sq USING (size)
                LEFT JOIN inventory_smart.article_status_tag ast using (product_code, channel)
                GROUP BY 1, 2, 3
            )
            SELECT slb.*, sl.*,
                   sli.dc_code,
            	   sli.net_available,
                   COALESCE(sli.min_net_available, 0) min_net_available,
                   pd.allocated_qty,
                   pd.packs_allocated_qty,
                   pd.loose_units_allocated,
                   pd.pack_units_allocated,
                   pd.packs_allocated,
	               COALESCE(sli.dc, sli.dc_code::character varying) as dc,
                   smf.store_name,
                   smf.retail_facility_code store_id,
                   da.eaches_available,
                   ssl.lw_revenue,
                   ssl.lw_qty,
                   ssl.lw2_qty,
                   ssl.lw3_qty,
                   ssl.lw4_qty,
                   ssl.lw5_qty,
                   ssl.lw6_qty,
                   da.packs_available,
                --    dco.dc_rank as dc_order,
                   COALESCE(sp.priority_code, coalesce(pcc.priority_code, CASE WHEN pd.channel = 'RLS' THEN 'W' ELSE 'S' END)) priority_code,
                   TO_CHAR(COALESCE(msd.shipping_date::date, pcc.instore_date, Date(now())),'MM-DD-YYYY') AS shipping_date
            FROM store_level_base_table slb
            LEFT JOIN size_level sl USING(store_code)
            LEFT JOIN store_level_inv sli USING(store_code, size)
            -- LEFT JOIN dc_priority_ordering dco using (store_code, dc_code)
            LEFT JOIN dc_available da using(dc_code)
            LEFT JOIN packs_detail pd using(dc_code, store_code, size)
            LEFT JOIN store_priorities sp USING (article, store_code, dc_code)
            LEFT JOIN mat_level_shipping_date msd USING (article, store_code, dc_code)
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            left join sales_article_store_level ssl using(store_code)
            left join inventory_smart.priority_code_configuration pcc using(article,store_code)
            %3$s
            $$, $2, _article_filter, _store_filter1, _final_inv_query, _priority_allocation, _priority_allocation,_created_at,_created_at + interval '23 hours 59 minutes',_article_filter2, _l0_name);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
 $function$
;
