--liquibase formatted sql
--changeset liquibase:finalize_product_view_summary runOnChange:true stripComments:false splitStatements:false context:MTP-29953 labels:MTP-29953
--comment: fixed PO missing columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  /*
   * Function/Procedure name: inventory_smart.product_view_summary
   * Created by: Renugopal S
   * Created at: 21-July-2022
   * No of input parameter: 2
   * Parameter Description : $1 = Application name
   *                         $2 = Allocation Code
  *                          $3 = Ignore allocation code
                             $4 = article filter
                             $5 = type
   * Purpose:
   * This function is created to calculate Store View Allocation Summary which is displayed in the
   * Finalize screen of Allocate flow
   * Calling Statement:
   *
      begin;
      select * from inventory_smart.finalize_product_view_summary
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
   *
   */
    declare
        _query_combine text;
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

        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
            _article_filter2 = format($$WHERE article IN ('%s')$$, $4);
        END IF;
        IF ($5 = 'allocated')
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT article, dc_code, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    FROM (
                        SELECT article, size, dc_code::int, channel, pack_type_id FROM packs_base GROUP BY 1, 2, 3, 4, 5
                    ) a
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING(article, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
                ,reserve_allocation as (
                    SELECT dc_code, article, size, MAX(COALESCE(quantity,0)) user_reserve_qty,
                    SUM(CASE WHEN pack_flag = true THEN quantity/units_in_pack END) AS packs_reserved_qty,
                    SUM(CASE WHEN pack_flag = false THEN quantity END) AS loose_reserved_qty
                      FROM (
                          SELECT dc_code::int, article, size, channel FROM packs_base
                         GROUP BY 1, 2, 3, 4
                      ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article, size, channel)
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, channel, COALESCE(quantity,0) as allocated_reserve_qty, eaches_allocated, packs_allocated
                        FROM (
                            SELECT dc_code::int, article, pack_type_id, size, channel FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id, channel)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           COALESCE(dcs.name, dc_code::text) dc_name,
                           article,
                           size,
                           SUM(oh) as dc_available,
                           SUM(allocated_qty) as allocated_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                                THEN 0
                                ELSE COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0)
                           END as net_available,
                           CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                                THEN 0
                                ELSE COALESCE(MAX(oh_packs), 0) - COALESCE(MAX(packs_allocated), 0) - COALESCE(MAX(packs_allocated_qty), 0) - COALESCE(MAX(packs_reserved_qty), 0)
                           END as net_available_packs,
                           CASE WHEN dc_code in ('8880', '8882', '8883', '8884', '8004')
                                THEN 0
                                ELSE COALESCE(SUM(oh_eaches), 0) - COALESCE(SUM(eaches_allocated), 0) - COALESCE(SUM(loose_allocated_qty), 0) - COALESCE(SUM(loose_reserved_qty), 0)
                           END as net_available_eaches,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
                    FROM (
                         SELECT dc_code::int,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty,
                                SUM(packs_allocated_qty) packs_allocated_qty,
                                SUM(loose_allocated_qty) loose_allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, article, size)
                    LEFT JOIN reserve_allocation USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size)
                    LEFT JOIN global.distribution_centres dcs using(dc_code)
                    GROUP BY 1, 2, 3, 4
                )
                ,fourth_table as (
                    SELECT dc_code::text,
                           dc_name,
                           size,
                           SUM(dc_available) as dc_available,
                           SUM(allocated_qty) as allocated_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           SUM(net_available) net_available,
                           SUM(net_available_before_allocation) net_available_before_allocation,
                           MIN(net_available) min_net_available,
                           SUM(net_available_packs) net_available_packs,
                           SUM(net_available_eaches) net_available_eaches
                    FROM final_inv_size
                    GROUP BY 1, 2, 3
                )
            $$;
ELSIF ($5 = 'reserved')
        THEN
            _final_inv_query := $$
                ,reserve_allocation as (
                    SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty,
                    SUM(CASE WHEN pack_flag = true THEN quantity END) AS packs_reserved_qty,
                    SUM(CASE WHEN pack_flag = false THEN quantity END) AS loose_reserved_qty
                    FROM (
                          SELECT dc_code::int, article, size, pack_type_id FROM packs_base
                         GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN (
                        SELECT
                           dc_code,
                           article,
                           size,
                           size as pack_type_id,
                           quantity,
                           pack_flag
                         FROM inventory_smart.sku_dc_reserved_units_no_purge('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article, size, pack_type_id)
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
                ,fourth_table as (
                    SELECT dc_code::text,
                           COALESCE(name, dc_code::text) as dc_name,
                           size,
                           SUM(allocated_qty) as allocated_qty,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           COALESCE(SUM(user_reserve_qty), 0)  - COALESCE(SUM(allocated_qty), 0)  as net_available,
                           COALESCE(SUM(packs_reserved_qty), 0) - COALESCE(SUM(pack_units_allocated), 0) as net_available_packs,
                           COALESCE(SUM(loose_reserved_qty), 0) - COALESCE(SUM(loose_allocated_qty), 0) as net_available_eaches
                    FROM (
                        SELECT
                               size,
                               dc_code::int,
                               SUM(allocated_qty) as allocated_qty,
                               SUM(pack_units_allocated) as pack_units_allocated,
                                sum(packs_allocated_qty) as packs_allocated_qty,
                                SUM(loose_allocated_qty) as loose_allocated_qty,
                                sum(available_qty) as available_qty,
                                sum(available_qty) filter (where type ='E') as loose_available,
                                sum(packs_available) as packs_available
                        FROM packs_base
                        GROUP BY 1, 2
                    ) a
                    LEFT JOIN reserve_allocation USING (size, dc_code)
                    LEFT JOIN other_allocations USING (size, dc_code)
                    LEFT JOIN "global".distribution_centres dd USING (dc_code)
                    GROUP BY 1, 2, 3
                )
            $$;
        ELSIF ($5 = 'po')
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT pb.dc_code, pb.size, SUM(spau.oh) oh
                    FROM (
                        SELECT article, size, dc_code, channel FROM packs_base GROUP BY 1, 2, 3, 4
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
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2
                )
                ,fourth_table as (
                    SELECT dc_code::text,
                           dc_code as dc_name,
                           size,
                           SUM(allocated_qty) as allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available_eaches,
                           0 as net_available_packs
                    FROM (
                        SELECT size,
                               dc_code,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2
                    ) a
                    LEFT JOIN current_allocation USING (size, dc_code)
                    LEFT JOIN other_allocations USING (size, dc_code)
                    GROUP BY 1, 2, 3
                )
            $$;
        ELSE
            _final_inv_query := $$
        		,fourth_table as (
        		    SELECT a.dc_code::text,
        		           coalesce(dcs.name, a.dc_code::text) dc_name,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		           CASE WHEN a.dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE COALESCE(SUM(loose_available), 0) + COALESCE(SUM(packs_available_units), 0) - COALESCE(SUM(allocated_qty), 0)
        		       	   END as net_available,
        		       	   CASE WHEN a.dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE coalesce(sum(packs_available), 0) - coalesce(sum(packs_allocated_qty), 0)
        		       	   END as net_available_packs,
        		       	   CASE WHEN a.dc_code::text in ('8880', '8882', '8883', '8884', '8004')
                               THEN 0
                               ELSE coalesce(sum(loose_available), 0) - coalesce(sum(loose_allocated_qty), 0)
        		       	   END as net_available_eaches,
                           0 min_net_available
        		    FROM (
        		        SELECT
        		            article,
        		            size,
        		            dc_code,
        		            SUM(allocated_qty) as allocated_qty,
        		            SUM(pack_units_allocated) as pack_units_allocated,
        		            sum(packs_allocated_qty) as packs_allocated_qty,
        		            SUM(loose_allocated_qty) as loose_allocated_qty,
        		            max(available_qty) as available_qty,
        		            max(available_qty) filter (where type ='E') as loose_available,
                            max(available_qty) filter (where type='S') as packs_available_units,
        		            max(packs_available) as packs_available
						FROM packs_base
						GROUP BY 1, 2, 3
        		    ) a
        		    LEFT JOIN global.distribution_centres dcs on dcs.dc_code::text=a.dc_code
					GROUP BY 1, 2, 3
        		)
			$$;
        END IF;
        _query_combine := format($$
        ----PRODUCT VIEW  summary
        WITH
        --  created as (
        -- 	select (created_at::date)::timestamp from inventory_smart.plan_master pm
        -- 	WHERE plan_code = REPLACE('%1$s', 'edit_', '')
        --     )
        -- ,
        base_table as materialized(
            SELECT carfs.*, channel, store store_code, retail_size_cd size FROM
            (
            	select * from inventory_smart.create_allocation_result_flat_gurobi carfs
                where carfs.created_at between '%4$s'::timestamp and '%5$s'::timestamp
            ) carfs
            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
            WHERE allocation_code = '%1$s'
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
                %6$s
                GROUP BY 1, 2, 3, 4
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
--        select * from flat_table
--
        ,packs AS (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   size,
                   channel,
				   available_qty as packs_available,
                   available_qty * units_in_pack::double precision as available_qty,
                   allocated_qty packs_allocated_qty,
                   allocated_qty * units_in_pack::double precision AS allocated_qty
            FROM inventory_smart.dc_pack_configuration dpc
            JOIN flat_table USING (article, pack_type_id)
        )
--        select * from flat_table
--
        ,packs_base as (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   pack_type_id as size,
                   allocated_qty,
                   channel,
				   available_qty,
				   0 as packs_allocated_qty,
                    0 as pack_units_allocated,
                    0 as packs_available,
                    allocated_qty as loose_allocated_qty,
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
                    allocated_qty as pack_units_allocated,
                    packs_available,
                    0 as loose_allocated_qty,
                    'S' as type
           FROM packs
        )
        ,sales_aggregate as (
        select
             round(sum(lw_qty), 2) lw_qty,
             round(sum(lw_revenue)::int, 2) as lw_revenue
             from (
				select article,
						store_code,
						avg(aid.lw_qty) as lw_qty,--avg to consider all sizes
						avg(aid.lw_revenue) as lw_revenue
				from packs_base
				left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
				group by 1, 2
			) a
        )
        -- select * from sales_aggregate;
		%3$s
        ,first_table as (
            --article count and store count
            SELECT COUNT(DISTINCT article) as art_cnt,
                   COUNT(DISTINCT store_code) as store_cnt
            FROM packs_base
            WHERE allocated_qty > 0
        )
--        select * from first_table
--
        ,second_table as (
            --store average
            SELECT AVG(store_count) as store_avg
            FROM (
                SELECT article, COUNT(DISTINCT store_code) as store_count
                FROM packs_base
                WHERE allocated_qty > 0
                GROUP BY 1
            ) as a
        )
        ,third_table as (
            SELECT b.size,
                   b.dc_code,
                   MIN(ast."order") as size_order,
                   SUM(allocated_qty) as allocated_size,
                   SUM(packs_allocated_qty) as packs_allocated_qty,
                   SUM(loose_allocated_qty) as loose_allocated_qty
            FROM (SELECT article, size, channel, dc_code, SUM(allocated_qty) allocated_qty, SUM(packs_allocated_qty) packs_allocated_qty, SUM(loose_allocated_qty) loose_allocated_qty FROM packs_base GROUP BY 1, 2, 3, 4) b
            LEFT JOIN (
                SELECT article, size, product_code
                FROM global.product_attributes_filter paf WHERE l0_name = any('%7$s'::varchar[]) and article in (SELECT distinct article from base_table %6$s) and active
            ) paf USING (article, size)
            LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
            group by 1, 2
        )
         ,fifth_table as (
            --article count and store count
            SELECT
                   COUNT(DISTINCT store_code) as all_stores
            FROM packs_base
        )
        ,gender_count as (
            SELECT COUNT(DISTINCT l1_name) as gender_count
            FROM global.product_attributes_filter WHERE l0_name = any('%7$s'::varchar[]) and article IN (SELECT DISTINCT article FROM packs_base)
        )
--        select * from third_table
--
--        select * from fourth_table
--
        SELECT dc_code,
               dc_name as dc,
               art_cnt,
               lw_qty,
               lw_revenue,
               store_cnt,
               all_stores,
               gender_count,
               store_avg,
               size,
               size_order,
               allocated_size,
               packs_allocated_qty,
               loose_allocated_qty,
               allocated_qty,
               net_available as net_dc_available,
               net_available_packs,
               net_available_eaches,
               allocation_perc
        FROM (
            SELECT *,
                   CASE WHEN allocated_qty = 0 THEN 0
                           ELSE allocated_size / allocated_qty
                   END AS allocation_perc
            FROM first_table
            CROSS JOIN second_table
            CROSS JOIN (SELECT * FROM fourth_table LEFT JOIN third_table USING(size, dc_code)) foo
            CROSS JOIN gender_count
            cross join sales_aggregate
            cross join fifth_table
        ) a
        ORDER BY size_order
        $$, $2, _article_filter, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes',_article_filter2, _l0_name);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
$function$
;