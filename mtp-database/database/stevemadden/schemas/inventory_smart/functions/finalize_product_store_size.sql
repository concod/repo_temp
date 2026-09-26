--liquibase formatted sql
--changeset liquibase:ajunravi_po_allocation_related_changes_and_improvements runOnChange:true stripComments:false splitStatements:false context:MTP-67569 labels:MTP-67569
--comment: MTP-67569
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store_size(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store_size(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store_size
  * Created by: Ajun Ravi
  * Created at: 27-November-2023
  * No of input parameter: 6
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                         $3 = Store code
  *                         $4 = Article code/SKU code
  *                         $5 = Ignore allocation code
  *						    $6 = type
  */
 declare
    _query_combine text;
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _created_at timestamp;
    begin
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
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
                    --SELECT dc_code, size, pack_type_id, SUM(oh) oh, SUM(it) it, SUM(oo) oo, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    SELECT dc_code, size, pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                	FROM (
                	    SELECT article, size, dc_code::int dc_code, channel, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
                ,reserve_allocation as (
                
                	SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code::int dc_code, article, size FROM packs_base
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                    USING (dc_code, article, size)
                    GROUP BY 1, 2
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
                         sum(allocated_qty) allocated_qty,
                         SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
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
                   	           COALESCE(SUM(oh_eaches), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(eaches_allocated), 0) eaches_available,
                   	           COALESCE(SUM(oh_packs), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(packs_allocated), 0) packs_available
                        FROM (
                            SELECT dc_code::int dc_code, size, pack_type_id, type, pack_description, SUM(allocated_qty) as allocated_qty
                            FROM packs_base
                            GROUP BY 1, 2, 3, 4, 5
                        ) foo
                        LEFT JOIN current_allocation USING (dc_code, size, pack_type_id)
                        LEFT JOIN other_allocations USING (dc_code, size , pack_type_id)
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
                           sum(allocated_qty) allocated_qty,
			   SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
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
        		,current_allocation as (
                    --SELECT dc_code, size, pack_type_id, SUM(oh) oh, SUM(it) it, SUM(oo) oo, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    SELECT dc_code::text, size, pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                	FROM (
                	    SELECT article, size, dc_code::int dc_code, channel, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
                --select * from current_allocation
                
                ,other_allocations as (
                
                	SELECT dc_code::text, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_allocated_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3
                )
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
                        LEFT JOIN other_allocations USING (dc_code, size , pack_type_id)
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
                where carfs.created_at between '%5$s'::timestamp and '%6$s'::timestamp
                and allocation_code = '%1$s' %2$s
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
                       allocated_qty * units_in_pack::double precision AS allocated_qty,
                       pack_type_id as pack_description
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
            ,sales_article_store_size_level as (
				SELECT  store_code, size,
						COALESCE(round(avg(aid.lw_qty), 2), 0) AS lw_qty,
                        COALESCE(round(avg(aid.lw_revenue)::Decimal, 2), 0) AS lw_revenue,
                        COALESCE(round(avg(aid.wos_predicted)::Decimal, 2), 0) AS wos_predicted,
                        COALESCE(round(avg(aid.available_stores_percentage)::Decimal, 2), 0) AS available_stores_percentage
				FROM packs_base
                LEFT JOIN (
                    SELECT size, product_code FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
                ) sq USING (size)
				LEFT JOIN inventory_smart.store_stock_drilldown aid using(store_code, product_code)
                %3$s
				GROUP BY 1, 2
            )
           -- select * from sales_store_level;
            ,packs_detail as (
                SELECT article, dc_code, store_code, size, channel,
                       SUM(allocated_qty) allocated_qty,
                       JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) FILTER (WHERE type = 'S') packs_allocated_qty,
                       --MAX(packs_allocated_qty) packs_allocated_qty,
                       JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) FILTER (WHERE type = 'E') article_allocated_qty,
                       SUM(CASE WHEN TYPE = 'E' THEN allocated_qty END) AS loose_units_allocated,
                       SUM(CASE WHEN TYPE = 'S' THEN allocated_qty END) AS pack_units_allocated,
                       --STRING_AGG(DISTINCT CASE WHEN TYPE = 'S' THEN pack_type_id END, ',') AS packs_allocated,
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
                       GREATEST(0, MIN - (updated_oh_oo_it)) as min_short,
                       GREATEST(0, allocated_total - GREATEST(0, MIN - (updated_oh_oo_it))) as wos_allocation,
                       LEAST(allocated_total, GREATEST(0, MIN - (updated_oh_oo_it))) as min_allocation
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
            ,size_level as (
                 SELECT store_code,
                       bt.size,
                       ast.order,
                       min_influenced_allocation,
                       bt.MIN as min_size,
                       bt.MAX as max_size,
                       SUM(demand) as demand_size,
                       SUM(allocated_total) as allocated_quantity_size,
                       SUM(oh) as oh_size,
                       SUM(oo) as oo_size,
                       SUM(it) as it_size,
                       SUM(min_allocation) as min_allocation_size,
                       SUM(wos_allocation) as wos_allocation_size ,
                       SUM(wos) as wos,
                       SUM(ros) as forecast_aps,
                       SUM(oh) + SUM(oo) + SUM(it) as oh_oo_it_size
                FROM base_table_min_wos bt
                LEFT JOIN (
                    SELECT size, product_code FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
                ) sq USING (size)
                LEFT JOIN inventory_smart.article_status_tag ast using (product_code, channel)
                GROUP BY 1, 2, 3, 4,5,6
            ), constraints as (
                SELECT store_code,
                       bt.size,
                       COALESCE(SUM(cm.min_stock), 0) as min_stock,
                       COALESCE(SUM(cm.max_stock), 0) as max_stock,
                       COALESCE(SUM(bt.wos), 0) as twos,
						COALESCE(SUM(cm.wos), 0) as cwos
                FROM base_table_min_wos bt
                LEFT JOIN (
                    SELECT size, product_code FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
                ) sq USING (size)
                LEFT JOIN inventory_smart.constraint_master cm using (product_code, store_code)
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
                   pd.article_allocated_qty,
	               sli.dc,
                   smf.store_name,
                   da.eaches_available,
                   ssl.lw_revenue,
                   ssl.lw_qty,
                   ssl.wos_predicted,
                   ssl.available_stores_percentage,
                   da.packs_available,
                   da.pack_description,
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
            $$, $2, _article_filter, _store_filter1, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes');
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
 $function$
;
