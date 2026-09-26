--liquibase formatted sql
--changeset liquibase:finalize_product_store_size_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-48151  labels:MTP-48151. 
--comment: MTP-48151 , sku_dc_reserved_units -> sku_dc_reserved_units_no_purge, MTP-48151 fix for Bulk PO,MTP-50162 - group by issue fix,performance change sync, reserved MTP-48151
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store_size(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store_size(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.finalize_product_store_size
  * Created by: Mayank D
  * Created at: 15-September-2023
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
     select * from inventory_smart.finalize_product_store_size
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

        if ($3 = '') IS FALSE
            then
                _store_filter1 := format($$WHERE store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE aid.store_code = '%s'$$, $3);
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
                    SELECT dc_code, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, size, dc_code::int FROM packs_base GROUP BY 1, 2, 3
                    ) a
    				LEFT JOIN inventory_smart.sku_dc_available_units USING(article, dc_code, size)
                    GROUP BY 1, 2
                )
                ,reserve_allocation as (
                    SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code::int, article, size FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units sdru
                    USING (dc_code, article, size)
                    GROUP BY 1, 2
                )
                ,other_allocations as (
                    SELECT dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code::int, article, pack_type_id, size FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           COALESCE(dcs.name, dc_code::text) dc,
                           size,
                           sum(allocated_qty) allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           CASE WHEN dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0)
                           END as net_available
                    FROM (
                         SELECT dc_code::int,
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
           		    SELECT dc_code,
                           JSON_OBJECT_AGG(size, net_available) eaches_available,
           		    	   '{}'::JSON packs_available
           		    FROM final_inv
                    GROUP BY 1
                )
            $$;
-- for user reserved
        ELSIF ($6 = 'reserved')
        THEN
			_final_inv_query := $$
                ,reserve_allocation as (
                    SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code::int, article, size FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units_no_purge sdru
                    USING (dc_code, article, size)
                    GROUP BY 1, 2
                )
                ,other_allocations as (
                    SELECT dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code::int, article, pack_type_id, size FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           COALESCE(dcs.name, dc_code::text) dc,
                           size,
                           sum(allocated_qty) allocated_qty,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(user_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0)
                           END as net_available
                    FROM (
                         SELECT dc_code::int,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2
                    ) foo
                    LEFT JOIN reserve_allocation USING (dc_code, size)
                    LEFT JOIN other_allocations USING (dc_code, size)
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
                    SELECT pb.dc_code, pb.size, SUM(spau.oh) oh
                    FROM (
                        SELECT article, size, dc_code,channel FROM packs_base GROUP BY 1, 2, 3, 4
                    ) pb
    				LEFT JOIN inventory_smart.sku_po_available_units spau
    				ON pb.article = spau.article AND pb.size = spau.size AND pb.channel = spau.channel AND pb.dc_code = spau.po_code
                    GROUP BY 1, 2
                )
                ,other_allocations as (
                    SELECT dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size, channel FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) am
                        JOIN inventory_smart.sku_po_allocated_units
                        USING (dc_code, article, size, pack_type_id, channel)
                    ) a
                    GROUP BY 1, 2
                )
                ,final_inv as (
                    SELECT dc_code,
                           dc_code dc,
                           size,
                           sum(allocated_qty) allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
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
        		           COALESCE(dcs.name, a.dc_code::text)as dc,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		           CASE WHEN a.dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)
                           END as net_available
        		    FROM (
        		        SELECT article,
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
           		    	   JSON_OBJECT_AGG(pack_type_id, available_qty) FILTER (WHERE type = 'S') packs_available
           		    FROM (
                        SELECT dc_code, size, pack_type_id, type, available_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                   ) foo
                   GROUP BY 1
                )
            $$;
        END IF;

        _query_combine := format($$
             ------  product store view
            WITH
            -- created as (
            --             select (created_at::date)::timestamp from inventory_smart.plan_master pm
            --             WHERE plan_code = REPLACE('%1$s', 'edit_', '')
            -- )
            -- ,
            base_table as materialized(
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
            ),
            product_attributes as materialized(
            SELECT size, product_code FROM global.product_attributes_filter paf
                    WHERE
                    l0_name = any('%8$s'::varchar[]) and
                    article in (SELECT distinct article from base_table %7$s) and active
            )
            ,sales_article_store_size_level as (
				SELECT  aid.store_code, size,
						COALESCE(round(avg(aid.lw_qty), 2), 0) AS lw_qty,
                        COALESCE(round(avg(aid.lw_revenue)::Decimal, 2), 0) AS lw_revenue,
                        COALESCE(round(avg(aid.wos_predicted)::Decimal, 2), 0) AS wos_predicted,
                        COALESCE(round(avg(aid.available_stores_percentage)::Decimal, 2), 0) AS available_stores_percentage
				FROM packs_base pb
                LEFT JOIN product_attributes sq USING (size)
				LEFT JOIN inventory_smart.store_stock_drilldown aid on
                md5(aid.store_code || '-' || aid.article || '-' || aid.product_code) = md5(pb.store_code || '-' || pb.article || '-' || sq.product_code)
                %9$s
				GROUP BY 1, 2
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
                SELECT store_code, dc_code, dc, size, net_available
                FROM (
                    SELECT store_code,
                           size,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                    %7$s
                ) foo
                LEFT JOIN final_inv USING(dc_code, size)
                GROUP BY 1, 2, 3, 4, 5
            )
            --select * from store_level_inv
            --
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
            ,size_level as (
                 SELECT store_code,
                       bt.size,
                       ast.order,
                       min_influenced_allocation,
                       COALESCE(SUM(demand), 0) as demand_size,
                       COALESCE(SUM(allocated_total), 0) as allocated_quantity_size,
                       COALESCE(SUM(oh), 0) as oh_size,
                       COALESCE(SUM(oo), 0) as oo_size,
                       COALESCE(SUM(it), 0) as it_size,
                       COALESCE(SUM(min_allocation), 0) as min_allocation_size,
                       COALESCE(SUM(wos_allocation), 0) as wos_allocation_size ,
                       COALESCE(SUM(MIN), 0) as min_size,
                       COALESCE(SUM(MAX), 0) as max_size,
                       COALESCE(SUM(wos), 0) as wos,
                       COALESCE(SUM(ros), 0) as forecast_aps,
                       COALESCE(SUM(oh), 0) + COALESCE(SUM(oo), 0) + COALESCE(SUM(it), 0) as oh_oo_it_size
                FROM base_table_min_wos bt
                LEFT JOIN product_attributes sq USING (size)
                LEFT JOIN inventory_smart.article_status_tag ast using (product_code, channel)
                GROUP BY 1, 2, 3, 4
            ), constraints as (
                SELECT store_code,
                       bt.size,
                       COALESCE(SUM(cm.min_stock), 0) as min_stock,
                       COALESCE(SUM(cm.max_stock), 0) as max_stock,
                       COALESCE(SUM(bt.wos), 0) as twos,
                       COALESCE(SUM(cm.wos), 0) as cwos
                FROM base_table_min_wos bt
                LEFT JOIN product_attributes sq USING (size)
                LEFT JOIN inventory_smart.constraint_master cm using (product_code, store_code)
                where cm.l0_name = any('%8$s'::varchar[])
                GROUP BY 1, 2
            )
            SELECT sl.*,
                   sli.dc_code,
            	   sli.net_available,
                   pd.allocated_qty,
                   pd.packs_allocated_qty,
                   pd.loose_units_allocated,
                   pd.pack_units_allocated,
                   pd.packs_allocated,
                   COALESCE(sli.dc, sli.dc_code::character varying)  as dc,
                   smf.store_name,
                   smf.retail_facility_code store_id,
                   da.eaches_available,
                   ssl.lw_revenue,
                   ssl.lw_qty,
                   ssl.wos_predicted,
                   ssl.available_stores_percentage,
                   da.packs_available,
                   ct.min_stock,
                   ct.max_stock,
                   ct.twos,
ct.cwos,
                   CASE
                   WHEN sl.min_influenced_allocation = TRUE THEN 'Yes'
                   ELSE 'No'
                   END AS min_influenced_allocation
            FROM size_level sl
            LEFT JOIN constraints ct USING(store_code, size)
            LEFT JOIN store_level_inv sli USING(store_code, size)
            LEFT JOIN dc_available da using(dc_code)
            LEFT JOIN packs_detail pd using(dc_code, store_code, size)
            LEFT JOIN global.store_attributes_filter smf using (store_code)
            left join sales_article_store_size_level ssl using(store_code, size)
            %3$s
            $$, $2, _article_filter, _store_filter1, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes',_article_filter2, _l0_name,_store_filter2);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
 $function$
;
