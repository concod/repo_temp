--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:net_dc_size_finalize runOnChange:true stripComments:false splitStatements:false context:MTP-41563 labels:MTP-41563.MTP-47928
--comment: MTP-41563  model_description added,  MTP-45264 , MTP-47928 updated, fix: pointing to different dc name, fix:allocation percentage and negative net dc, fixed issue where non eligible stores are being considered, MTP-50162, fix issue on finalized plans, fix join issue reserved, sku_dc_reserved_units -> sku_dc_reserved_units_no_purge, performance change sync
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying);
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
  *                             $3 = Store code
  *                             $4 = Ignore allocation codes
                                $5 = article filter
                                $6 = type
  * Purpose:
  * This function is created to calculate Store View Allocation Summary which is displayed in the
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
     select * from inventory_smart.finalize_product_view
         ('my_cur',
          '6_155_PFS_20230519T071512',
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
       	_created_at timestamp;
       _l0_name varchar;
    begin
        set cursor_tuple_fraction TO 1.0;
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$WHERE store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$where article IN ('%s')$$, $5);
        END IF;

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
                    SELECT dc_code, article, size, MAX(COALESCE(quantity,0)) user_reserve_qty
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
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           COALESCE(dcs.name, dc_code::text) dc,
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
                    LEFT JOIN global.distribution_centres dcs using(dc_code)
                    GROUP BY 1, 2, 3, 4
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           dc,
                           article,
                           size as retail_size_cd ,
                           SUM(net_available) net_available,
                           SUM(net_available_before_allocation) net_available_before_allocation,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1, 2, 3, 4
                )
            $$;
        ELSIF ($6 = 'reserved')
        THEN
            _final_inv_query := $$
                ,reserve_allocation as (
                    SELECT dc_code, article, size, MAX(COALESCE(quantity,0)) user_reserve_qty
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
                        SELECT dc_code::int, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size FROM packs_base
                            GROUP BY 1, 2, 3, 4
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           COALESCE(dcs.name, dc_code::text) dc,
                           article,
                           size,
                           COALESCE(SUM(user_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available,
                           COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
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
                           dc,
                           article,
                           size as retail_size_cd ,
                           SUM(net_available) net_available,
                           SUM(net_available_before_allocation) net_available_before_allocation,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1, 2, 3, 4
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
                        USING (dc_code, article, size, pack_type_id, channel)
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
                           article,
                           size as retail_size_cd ,
                           SUM(net_available) net_available,
                           SUM(net_available_before_allocation) net_available_before_allocation,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1, 2, 3, 4
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
                       size as retail_size_cd ,
                       SUM(allocated_qty) as allocated_qty,
                       SUM(available_qty) as net_available_before_allocation,
                       CASE WHEN pb.dc_code in ('8880', '8882', '8883', '8884', '8004')
                            THEN 0
                            ELSE COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)
                       END as net_available,
                       0 min_net_available
                FROM packs_base_grouped pb
                LEFT JOIN global.distribution_centres dcs on pb.dc_code = dcs.dc_code::text
                GROUP BY 1, 2, 3, 4
            )
            $$;
        END IF;

       select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
       select attribute_value into _l0_name from inventory_smart.plan_attributes pm WHERE plan_code = REPLACE($2, 'edit_', '') and attribute_name = 'l0_name';
        raise notice '_l0_name: %', _l0_name;
        _query_combine := format($$
            ------ PRODUCT VIEW - TABLE DATA
            WITH
--            created as (
--                        select (created_at::date)::timestamp from inventory_smart.plan_master pm
--                        WHERE plan_code = REPLACE('%1$s', 'edit_', '')
--            )
--            ,
            base_table as materialized  (
                SELECT carfs.*, channel, store store_code, retail_size_cd size,
                       (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
--                WHERE carfs.created_at between (select created_at from created) and (select created_at + interval '23 hours 59 minutes' from created)
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
                    %3$s
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
            ,sales_article_level as (
                SELECT
                    article,
                    ROUND(SUM(lw_qty)::numeric, 2) lw_qty,--store summed
                    ROUND(SUM(lw_revenue)::int, 2) as lw_revenue,
                    ROUND(SUM(lw2_qty)::numeric, 2) lw2_qty,
                    ROUND(SUM(lw3_qty)::numeric, 2) lw3_qty,
                    ROUND(SUM(lw4_qty)::numeric, 2) lw4_qty,
                    ROUND(SUM(lw5_qty)::numeric, 2) lw5_qty,
                    ROUND(SUM(lw6_qty)::numeric, 2) lw6_qty
                FROM (
                    SELECT article,
                           store_code,
                           avg(aid.lw_qty) as lw_qty,--size  avg
                           avg(aid.lw_revenue) as lw_revenue,
                           avg(aid.sales_2_ago) as lw2_qty,
                           avg(aid.sales_3_ago) as lw3_qty,
                           avg(aid.sales_4_ago) as lw4_qty,
                           avg(aid.sales_5_ago) as lw5_qty,
                           avg(aid.sales_6_ago) as lw6_qty
                    FROM packs_base
                    LEFT JOIN inventory_smart.article_inventory_dashboard aid using(article, store_code)
                    %2$s
                    GROUP BY 1, 2
                ) al
                GROUP BY article
            )
            --select * from sales_article_level;
            ,packs_detail as (
                SELECT article, dc_code, size, channel,
                       SUM(allocated_qty) allocated_qty,
                       SUM(packs_allocated_qty) packs_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty ELSE 0 END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty ELSE 0 END) AS pack_units_allocated,
                       STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_type_id END, ',') AS packs_allocated
                FROM packs_base %2$s
                GROUP BY 1, 2, 3, 4
            )
            %4$s
            ,article_level_inv as (
                SELECT dc_code, dc, article,retail_size_cd as size, net_available, net_available_before_allocation, min_net_available
                FROM (
                    SELECT article,retail_size_cd,
                           JSONB_OBJECT_KEYS(pack_dc_allocation) as dc_code
                    FROM base_table
                    %3$s
                ) foo
                LEFT JOIN final_inv USING(dc_code, article,retail_size_cd)
                GROUP BY 1, 2, 3, 4, 5, 6, 7
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
                      %3$s
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
                            %3$s
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
                    %3$s
                    GROUP BY 1, 2, 3
                ) a
                JOIN aps_split
                USING(article, store_code)
                GROUP BY 1, 2
            )
            ,article_level_base_table as (
                SELECT bt.article,
                       inventory_source,
                       demand_type,
                       array_to_string(bt.selected_store_group_names, ', ') AS store_group_names,
                       SUM(demand) as demand,
                       COUNT( DISTINCT(
                            CASE WHEN allocated_total > 0 then store_code end)
                       ) as store,  --all allocated stores
                       COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                       SUM(MIN) as MIN,
                       SUM(MAX) as MAX,
                       ROUND(SUM(oh)::numeric, 0) oh,
                       ROUND(SUM(oo)::numeric, 0) oo,
                       ROUND(SUM(it)::numeric, 0) it,
                       ROUND(SUM(lt_forecast)::numeric, 0) lt_forecast,
                       ROUND((CASE WHEN SUM(demand_art) = 0 then AVG(aps_art)
                                   ELSE (SUM(demand_art * aps_art) / SUM(demand_art))
                              END)::numeric, 2) as original_aps,
                       ROUND((SUM(demand_art * ros_art) / nullif(SUM(demand_art), 0))::numeric, 2) as forecast_aps,
                       ROUND((CASE WHEN SUM(demand_art) = 0 THEN AVG(wos)
                                   ELSE (SUM(demand * wos) / nullif(SUM(demand), 0))
                              END)::numeric, 2) as target_wos,
                       ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::numeric, 2) as actual_wos,
                       COALESCE(SUM(oh_oo_intransit), 0) as oh_oo_intransit,
                       COALESCE(SUM(oh_oo_intransit), 0) as oh_oo_intransit,
                       COUNT(distinct concat(store_code, size)) as count_store_size
                FROM (select * from base_table %3$s) bt
                JOIN aps_table
                USING(article, store_code) %2$s
                GROUP BY 1, 2, 3, 4
            )
            SELECT alb.*, alipd.*, alipd.allocated_qty allocated_quantity_size, alipd.dc, ast.order, paf.*, COALESCE(sal.lw_qty, 0) as lw_qty, COALESCE(sal.lw_revenue, 0) as lw_revenue,
            COALESCE(sal.lw2_qty, 0) as lw2_qty,COALESCE(sal.lw3_qty, 0) as lw3_qty,COALESCE(sal.lw4_qty, 0) as lw4_qty,COALESCE(sal.lw5_qty, 0) as lw5_qty,COALESCE(sal.lw6_qty, 0) as lw6_qty
            FROM article_level_base_table alb
            LEFT JOIN
            (select * from article_level_inv ali
            JOIN packs_detail pd using(article, dc_code,size)) alipd
            USING(article)
            left join sales_article_level sal using(article)
            -- LEFT JOIN global.store_attributes_filter smf using (store_code)
            LEFT JOIN (
            SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, product_description description, model_description, color, style_color_id, brand, COALESCE(vendor_case_pack, '1') vendor_case_pack
                FROM global.product_attributes_filter paf WHERE l0_name=any('%7$s'::varchar[]) and article in (SELECT distinct article from base_table %3$s) and active
            ) paf USING (article, size)
            LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
        $$, $2, _store_filter, _article_filter, _final_inv_query, _created_at, _created_at + interval '23 hours 59 minutes',_l0_name);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    END
$function$
;
