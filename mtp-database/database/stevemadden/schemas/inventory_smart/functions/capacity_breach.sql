--liquibase formatted sql
--changeset liquibase:capacity_breach runOnChange:true stripComments:false splitStatements:false context:MTP-55730 labels:MTP-55730
--comment: MTP-55730
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach(character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach(character varying, character varying, character varying)
 RETURNS TABLE(article character varying, 
                l0_name character varying, 
                l1_name character varying, 
                l2_name character varying, 
                l3_name character varying, 
                l4_name character varying, 
                style_name character varying,
                size character varying, 
                store_code character varying, 
                store_name character varying, 
                retail_facility_code character varying, 
                channel character varying, 
                unit_capacity integer, 
                oh_it_oo bigint, 
                net_capacity integer, 
                net_available integer, 
                user_reserve_qty integer, 
                fwos numeric, 
                twos numeric, 
                allocated_qty integer, 
                lw_qty integer, 
                lw_revenue real, 
                lw_margin integer, 
                sales_2_ago integer, 
                sales_3_ago integer, 
                sales_4_ago integer, 
                parent_article text, 
                pack_description text, 
                pack_units_allocated integer, 
                loose_units_allocated integer)
 LANGUAGE plpgsql
AS $function$
   /* 
    * Function/Procedure name: inventory_smart.capacity_breach
    * Created by: Renugopal S
    * Created at: 01-01-2023
    * No of input parameter: 2
    * Parameter Description : 
    *                         1 = Allocation Code
    *                           2 = Article List
    *                           3 = PO or default
   
    * Purpose: 
    * This function is created to calculate capacity breach after allocation at a store department(l1) level
    * Finalize screen of Allocate flow - 3rd tab
    * Calling Statement:
        select * from inventory_smart.capacity_breach
            ('6_250_FactoryLineRetail_20230626T101741', '', '');
    *
    *
    * if any modification done in same function/procedure please record the changes in below format
    *
    * Updated_by       Updated_on      Purpose
    * ----------       -----------     --------
    *
    */
declare
    _query_combine text:= '';
    _article_filter text := '';
    _final_inv_query text := '';
    _created_at timestamp;

  	-- _cache_payload jsonb := jsonb_build_object('allocation_code', $1);
  	-- _cache_table_id text;
  	-- _cache_schema text := 'inventory_smart';
  	-- _cache_sp text := '.capacity_breach';
  	-- _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  	-- _cache_dependencies text[] := '{}';
   
    begin
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($1, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
            IF ($2 = '') IS FALSE
     THEN
        _article_filter = format($$AND article IN ('%s')$$, $2);
     END IF;
        
    CASE $3
            WHEN 'PO'
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT a.article, a.dc_code, a.size, SUM(oh) oh
                    FROM (
                        SELECT article, dc_code, channel, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) a 
                    LEFT JOIN inventory_smart.sku_po_available_units po --for specific PO
                    ON a.article = po.article  AND a.dc_code = po.po_code AND a.size = po.size 
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size,  SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, 
                    FROM (
                        SELECT article, dc_code, channel, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) a 
                    JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT 
                           article,
                           l2_name,
                           dc_code::text,
                           dc_code::text dc,
                           size,
                           AVG(allocated_qty) allocated_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) as net_available
                    FROM (
                         SELECT 
                               article,
                               l2_name,
                                dc_code,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_detail
                        GROUP BY 1, 2, 3, 4
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, size, article)
                    LEFT JOIN other_allocations USING (dc_code, size, article)
                   -- LEFT JOIN global.distribution_centres dcs using(dc_code) 
                    GROUP BY 1, 2, 3, 4, 5
                )

            $$;
        ELSE
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT article, dc_code, size, pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs*units_in_pack) oh_packs
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    				JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3, 4
                )
                ,reserve_allocation as (
                    SELECT article, dc_code, size, size pack_type_id, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code::int dc_code, article, size, channel FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                    USING (dc_code, article, size, channel)
                    GROUP BY 1, 2, 3, 4
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    				JOIN inventory_smart.sku_dc_allocated_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3, 4
                )
                ,final_inv as (
                    select
                    	   article,
                    	   l1_name,
                    	   dc_code::text dc_code,
                           dcs.name dc,
                           size,
                           AVG(allocated_qty) allocated_qty, 
                  					COALESCE(SUM(user_reserve_qty), 0) as user_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                    FROM (
                        SELECT 
                            article,
                            l1_name,
                            dc_code::int dc_code,
                            size,
                            SUM(allocated_qty) as allocated_qty
                        FROM packs_detail
                        GROUP BY 1, 2, 3, 4
                    ) foo
                    LEFT JOIN current_allocation USING (article, dc_code, size)
                    LEFT JOIN reserve_allocation USING (article, dc_code, size)
                    LEFT JOIN other_allocations USING (article, dc_code, size)
                    LEFT JOIN global.distribution_centres dcs using(dc_code) 
                    GROUP BY 1, 2, 3, 4, 5
                )
                --select * from final_inv;
            $$;
        -- no case for view past since we only have today's capacity
        END CASE;
        --raise notice '%', _final_inv_query;
               
        _query_combine := format($$
           WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE carfs.created_at between '%4$s'::timestamp and '%5$s'::timestamp
                and allocation_code = '%1$s' %2$s
            )
          --  select * from base_table;
            ,flat_table as (
                SELECT article,
                       store_code,
                       store_name,
                       js.key::int dc_code, 
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                          UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                FROM (
                    SELECT article, store_code, store_name, channel, pack_dc_allocation FROM base_table 
                    GROUP BY 1, 2, 3, 4, 5
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )  
           -- select * from flat_table 
            ,packs AS (
                SELECT article,
                    dc_code,
                    store_code,
                    pack_type_id,
                    parent_article,
                    pack_description,
                    size,
                    channel,
                    available_qty,
                    allocated_qty packs_allocated_qty,
                    allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT ft.article,
                    ft.dc_code,
                    ft.store_code,
                    ft.pack_type_id,
                    ft.pack_type_id as size,
                    ft.pack_type_id as pack_description,
                    ft.pack_type_id as parent_article,
                    ft.allocated_qty,
                    ft.channel,
                    ft.allocated_qty as packs_allocated_qty,
                    'E' as type
                    FROM flat_table ft
                    WHERE NOT (ft.pack_type_id IN ( SELECT packs.pack_type_id FROM packs))
                UNION
                SELECT packs.article,
                    packs.dc_code,
                    packs.store_code,
                    packs.pack_type_id,
                    packs.size,
                    packs.pack_description,
                    packs.parent_article,
                    packs.allocated_qty,
                    packs.channel,
                    packs.packs_allocated_qty,
                    'S' as type
                    FROM packs
            )       
            ,packs_detail as (
                select
                    article,
                    paf.product_code,
                    paf.l0_name,
                    paf.l1_name,
                    paf.l2_name,
                    paf.l3_name,
                    paf.l4_name,
                    paf.style_name,
                    dc_code,
                    store_code,
                    size,
                    channel,
                    color,
                    SUM(allocated_qty) allocated_qty,
                    JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) filter (
                    where type = 'S') packs_allocated_qty,
                    SUM(case when type = 'E' then allocated_qty end) as loose_units_allocated,
                    SUM(case when type = 'S' then allocated_qty end) as pack_units_allocated,
                    STRING_AGG(distinct case when type = 'S' then pack_description end, ',') as packs_allocated
                from packs_base
                join "global".product_attributes_filter paf using(article, size)
                group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
            )     
            ,store_size_allocations as (
                SELECT
                    article,
                    store_code,
                    size,
                    SUM(allocated_qty) allocated_qty,
                    SUM(CASE WHEN type = 'E' THEN allocated_qty END) as loose_units_allocated,
                    SUM(CASE WHEN type = 'S' THEN allocated_qty END) as pack_units_allocated,
                    STRING_AGG(DISTINCT CASE WHEN type = 'S' THEN parent_article END, ',') as packs_allocated,
					STRING_AGG(DISTINCT CASE WHEN type = 'S' THEN pack_description END, ',') as pack_description
                FROM
                    packs_base
                GROUP BY 1, 2, 3
            )
            --select * from packs_detail;
            %3$s
        	-- ,other_allocations_to_store_dept as (
        	--     SELECT store_code,
        	--            l2_name,
        	--            MAX(quantity) as dept_store_allocated_units_other
        	--     FROM
        	--         packs_detail am
        	--     JOIN inventory_smart.sku_store_allocated_units USING(l2_name, store_code)
        	--     GROUP BY 1, 2
        	-- )
         --select * from other_allocations_to_store_dept;
       		,store_dept_inv as (
       		     SELECT
       		         store_code,
       		         l0_name,
       		         COALESCE(SUM(oh), 0) + COALESCE(SUM(it), 0)  + COALESCE(SUM(oo), 0) as store_inv
       		     FROM inventory_smart.latest_inventory li
       		     JOIN global.product_attributes_filter paf USING (product_code)
       		     WHERE l0_name in (SELECT DISTINCT l0_name FROM global.product_attributes_filter WHERE article in (SELECT DISTINCT article FROM packs_base))
       		     GROUP BY 1, 2
       		 )
           --select * from store_dept_inv;
       		,store_capacity as (
       		     SELECT
       		         store_code,
       		         product_hierarchy l0_name,
					 unit_capacity
       		     FROM inventory_smart.store_unit_capacity
       		     WHERE store_code in (SELECT DISTINCT store_code FROM packs_base)
       		 )
           --select * from store_capacity;
       		,store_allocations as (
       		     SELECT
       		         store_code,
       		         l0_name,
					 SUM(allocated_qty) allocated_qty
       		     FROM store_size_allocations
				 LEFT JOIN (SELECT * FROM global.product_attributes_filter WHERE article IN (SELECT DISTINCT article FROM base_table)) a USING (article, size)
				 GROUP BY 1, 2
       		 )
           --select * from store_allocations;
		   ,capacity_breach as (
				SELECT * FROM (
					SELECT
						store_code,
						l0_name,
						allocated_qty,
						unit_capacity,
						store_inv,
						COALESCE(unit_capacity, 0) - COALESCE(store_inv, 0) - COALESCE(allocated_qty, 0) as net_capacity
					FROM store_allocations
					LEFT JOIN store_dept_inv USING(store_code, l0_name)
					LEFT JOIN store_capacity USING(store_code, l0_name)
				) foo
				WHERE net_capacity < 0
		   )
		   ,article_level_store as (
				SELECT
					article,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
                    style_name,
					store_code,
					store_name,
					retail_facility_code,
					channel,
					size,
					allocated_qty,
					packs_allocated,
					pack_description,
         	pack_units_allocated,
         loose_units_allocated
				FROM store_size_allocations 
				LEFT JOIN (SELECT * FROM global.product_attributes_filter WHERE article IN (SELECT DISTINCT article FROM base_table)) a USING (article, size)
				LEFT JOIN global.store_attributes_filter USING(store_code)
		   )
		   ,wos_calcuations as (
            	SELECT article,
					   store_code,
					   ROUND((SUM(demand * current_wos) / nullif(SUM(demand), 0))::numeric, 2) as fwos,
            		   ROUND(MAX(wos)::numeric, 2) as twos
				FROM (
					SELECT article,
						   store_code,
						   wos,
						   demand,
                       	   (allocated_qty + oh_oo_intransit) / nullif(ros, 0) AS current_wos
					FROM base_table
					JOIN article_level_store USING(article, store_code, size)
				) foo
				GROUP BY 1, 2
		   )
				SELECT
					article,
					l0_name,
					als.l1_name,
					l2_name,
					l3_name,
					l4_name,
                    style_name,
					als.size::varchar,
					store_code,
					store_name,
					retail_facility_code,
					channel,
					unit_capacity::int,
					store_inv,
					net_capacity::int,
					fi.net_available::int,
					fi.user_reserve_qty::int,
					fwos::numeric,
					twos::numeric,
					SUM(als.allocated_qty)::int allocated_qty,
                	COALESCE(SUM(aid.lw_qty), 0)::int as lw_qty,
                	COALESCE(SUM(aid.lw_revenue), 0.0)::real as lw_revenue,
                	COALESCE(SUM(aid.lw_margin), 0)::int as lw_margin,
                	COALESCE(SUM(aid.sales_2_ago), 0)::int as sales_2_ago,
                	COALESCE(SUM(aid.sales_3_ago), 0)::int as sales_3_ago,
                	COALESCE(SUM(aid.sales_4_ago), 0)::int as sales_4_ago,
                    MAX(als.packs_allocated)::text parent_article,
					MAX(als.pack_description)::text pack_description,
					SUM(als.pack_units_allocated):: int pack_units_allocated,
					SUM(als.loose_units_allocated):: int loose_units_allocated
				FROM article_level_store als
				JOIN capacity_breach cb USING(store_code, l0_name)
				LEFT JOIN final_inv fi USING (article) 
            	LEFT JOIN (SELECT * FROM inventory_smart.article_inventory_dashboard WHERE article IN (SELECT DISTINCT article FROM base_table))aid using(article, store_code, channel)
				LEFT JOIN wos_calcuations USING(article, store_code)
				GROUP BY 
					article,
					l0_name,
					als.l1_name,
					l2_name,
					l3_name,
					l4_name,
                    style_name,
                    als.size,
					store_code,
					store_name,
					retail_facility_code,
					channel,
					unit_capacity,
					store_inv,
					net_capacity,
					fi.net_available,
					fi.user_reserve_qty,
					fwos,
					twos
      $$, $1, _article_filter, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes');

               raise notice '%', _query_combine;
             --  OPEN $1 FOR execute _query_combine;  
              --raise notice 'aha';
  		-- select * from cache.wrap_sp(
  		-- 	_cache_schema,
  		-- 	_cache_sp,
  		-- 	_cache_payload,
  		-- 	_query_combine,
  		-- 	_cache_dependencies,
  		-- 	_cache_key_pattern) into _cache_table_id;
  		-- perform set_config('myvars.cache_table_id', _cache_table_id, true);
  		-- raise notice '%', 'select * from "cache"."' || _cache_table_id || '" X ';
  		-- return query execute 'select * from "cache"."' || _cache_table_id || '" X';

   		RETURN QUERY execute _query_combine;	
    end
   $function$
;
