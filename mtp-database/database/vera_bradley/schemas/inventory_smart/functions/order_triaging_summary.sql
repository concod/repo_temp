--liquibase formatted sql
--changeset liquibase:order_triaging_summary po changes added runOnChange:true stripComments:false splitStatements:false context:MTP-22993-2 po changes addded in base tables labels:liquibase_project_start po changes
--comment: new po changes added in base table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_summary(input refcursor, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_summary(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_triaging_summary
  * Created by: Suba Selvandran N
  * Created at: 27-June-2023
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = other filters str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
declare
    _query_combine text;
    _allocation_type_filter text;
    begin
        _query_combine := format($$
            WITH product_filters AS (
                    SELECT * FROM
                    global.product_attributes_filter %1$s
                )
                ,store_filters AS (
                    SELECT * FROM
                    global.store_attributes_filter %2$s
                )
                ,base_table AS (
                    SELECT carfs.*, channel, store store_code, retail_size_cd size, pm.updated_at as plan_update_date  
                    FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                    LEFT JOIN global.store_attributes_filter saf ON store_code = store
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.plan_master where type in ('0','2','4')
                    ) pm ON carfs.allocation_code = pm.plan_code
                    WHERE article IN (SELECT article FROM product_filters)
                        AND store IN (SELECT store_code FROM store_filters)
                        AND pm.status = 2
                        AND pm.is_deleted = false
                )                  
                ,flat_table as (
                    SELECT allocation_code,
                        article,
                        store_code,
                        js.key dc_code, 
                        channel,
                        source,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                    FROM (
                        SELECT allocation_code, article, store_code, channel, pack_dc_allocation, source FROM base_table 
                        GROUP BY 1, 2, 3, 4, 5,6
                    ) foo , JSONB_EACH(pack_dc_allocation) js
                )             
                ,packs AS (
                    SELECT allocation_code,
                        article,
                        dc_code,
                        store_code,
                        pack_type_id,
                        size,
                        channel,
                        available_qty,
                        source,
                        allocated_qty packs_allocated_qty,
                        allocated_qty * units_in_pack::double precision AS allocated_qty,
                        dpc.parent_article,
                        dpc.pack_description
                    FROM inventory_smart.dc_pack_configuration dpc
                    JOIN flat_table USING (article, pack_type_id)
                )   
            ,packs_base as (
                    SELECT allocation_code,
                        article,
                        dc_code,
                        store_code,
                        pack_type_id,
                        pack_type_id as size,
                        allocated_qty,
                        source,
                        channel,
                        available_qty,
                        allocated_qty as packs_allocated_qty,
                        'E' as type,
                        null as parent_article,
                        null as pack_description
                    FROM flat_table
                    WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                    UNION
                    SELECT allocation_code,
                        article,
                        dc_code,
                        store_code,
                        pack_type_id,
                        size,
                        allocated_qty,
                        source,
                        channel,
                        available_qty,
                        packs_allocated_qty,
                        'S' as type,
                        parent_article,
                        pack_description
                FROM packs
                ),
                article_store_dc_level as (
                    SELECT allocation_code,
                        article,
                        store_code,
                        dc_code,
                        source,
                        parent_article,
                    pack_description,
                    SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    where source = 'dc'
                    GROUP BY 1, 2, 3, 4, 5, 6, 7
                ),
                article_store_po_level as (
                    SELECT allocation_code,
                        article,
                        store_code,
                        dc_code,
                        source,
                        parent_article,
                    pack_description,
                    SUM(allocated_qty) as allocated_qty
                    FROM packs_base
                    where source = 'po'
                    GROUP BY 1, 2, 3, 4, 5, 6, 7
                )
                ,current_allocation_dc as (
                    SELECT dc_code, article, size, SUM(oh) oh
                    FROM (
                        SELECT article, size, dc_code, channel FROM packs_base 
                        where source = 'dc'
                        GROUP BY 1, 2, 3, 4   	
                    ) a 
                        left join (select article, dc_code::text, size, channel, oh from inventory_smart.sku_dc_available_units )sda USING(article, dc_code, size, channel)
                    GROUP BY 1, 2, 3
                ),
                current_allocation_po as (
                        SELECT a.dc_code, a.size, a.pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                        FROM (
                            SELECT article, dc_code, channel, size, pack_type_id FROM packs_base
                                where source = 'po'
                            GROUP BY 1, 2, 3, 4, 5
                        ) a 
                        LEFT JOIN inventory_smart.sku_po_available_units po
                        ON a.article = po.article AND a.channel = po.channel AND a.dc_code :: text = po.po_code :: text  AND a.size = po.size AND a.pack_type_id = po.pack_type_id
                        GROUP BY 1, 2, 3
                ),
                reserve_allocation_dc as (
                    SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code, article, size, channel FROM packs_base
                        where source='dc'
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN (select article, dc_code::text, size, channel,quantity  from inventory_smart.sku_dc_reserved_units ) sdru 
                    USING (dc_code, article, size, channel)
                    GROUP BY 1, 2, 3
                ),
                other_allocations_dc as (
                    SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size, channel FROM packs_base
                            where source='dc'
                            GROUP BY 1, 2, 3, 4, 5
                        ) am
                        JOIN (select article, dc_code::text, size, channel,quantity,pack_type_id,allocation_code  from inventory_smart.sku_dc_allocated_units) sda
                        USING (dc_code, article, size, pack_type_id, channel)
                        WHERE allocation_code NOT IN (SELECT allocation_code FROM base_table)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,other_allocations_po as (
                        SELECT dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                        FROM (
                            SELECT article, dc_code::text, channel, size, pack_type_id FROM packs_base
                            where source='po'
                            GROUP BY 1, 2, 3, 4, 5
                        ) a 
                        JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, size, pack_type_id, channel)
                        GROUP BY 1, 2, 3
                    )
                ,final_inv_dc as (
                    SELECT dc_code,
                        article,
                        size,
                        sum(allocated_qty) allocated_qty,
                        SUM(oh) as dc_available,
                        SUM(allocated_reserve_qty) as allocated_reserve_qty,
                        SUM(user_reserve_qty) as user_reserve_qty,
                        greatest((COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0))::int, 0) as net_available
                    FROM (
                        SELECT dc_code,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                       where source='dc'
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN current_allocation_dc USING (dc_code, article, size)
                    LEFT JOIN reserve_allocation_dc USING (dc_code, article, size)
                    LEFT JOIN other_allocations_dc USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                ),
                final_inv_po as (
                        SELECT dc_code,
                                article,
                                size,
                            dc_code dc,
                            AVG(allocated_qty) allocated_qty,
                            COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) as net_available
                        FROM (
                            SELECT dc_code,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty
                            FROM packs_base
                            where source='po'
                            GROUP BY 1, 2, 3
                        ) foo
                        LEFT JOIN current_allocation_po USING (dc_code, size)
                        LEFT JOIN other_allocations_po USING (dc_code, size)
                        GROUP BY 1, 2, 3
                    ),
                final_inv_art_dc as (
                    SELECT dc_code,
                        article,
                        SUM(net_available) net_available
                    FROM final_inv_dc
                    GROUP BY 1, 2
                ),
                final_inv_art_po as (
                    SELECT dc_code,
                        article,
                        SUM(net_available) net_available
                    FROM final_inv_po
                    GROUP BY 1, 2
                ),
                article_store_level_dc as (
                    SELECT allocation_code, article, store_code, dc_code,
                            parent_article,
                        pack_description,
                        SUM(allocated_qty) dc_allocated,
                        SUM(net_available) dc_available,
                        null as po_allocated,
                        null as po_available                      
                    FROM article_store_dc_level
                    LEFT JOIN final_inv_art_dc USING(dc_code, article)
                    GROUP BY 1, 2, 3, 4, 5, 6
                ),
                article_store_level_po as (
                    SELECT allocation_code, article, store_code, dc_code,
                            parent_article,
                        pack_description,
                        SUM(allocated_qty) po_allocated,
                        SUM(net_available) po_available,
                        null as dc_allocated,
                        null as dc_available                      
                    FROM article_store_po_level
                    LEFT JOIN final_inv_art_po USING(dc_code, article)
                    GROUP BY 1, 2, 3, 4, 5, 6 
                ),
                article_store_level as (
                    select * from article_store_level_dc 
                    union 
                    select * from article_store_level_po
            )            
            select asld.dc_code, 
            	   asld.store_code,
                   dc.name,
            	   saf.store_name, 
            	   sum(asld.dc_allocated::int) dc_allocated,
            	   COALESCE((SELECT SUM(net_available) FROM final_inv_art_dc), 0) dc_available,
            	   sum(asld.po_allocated::int) po_allocated,
            	   sum(asld.po_available::int) po_available,
            	   COUNT(DISTINCT asld.article) article_count,
            	   COUNT(DISTINCT asld.allocation_code) allocation_count            	   	  
            from article_store_level asld
            LEFT JOIN global.distribution_centres dc on dc.dc_code ::text = asld.dc_code
            LEFT JOIN store_filters saf USING(store_code)
            GROUP BY 1, 2, 3, 4
            $$, $2, $3, _allocation_type_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;