--liquibase formatted sql
--changeset liquibase:capacity_breach runOnChange:true stripComments:false splitStatements:false context:MTP-29953 labels:MTP-29953
--comment: fixed PO missing columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach(character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach(character varying, character varying, character varying)
RETURNS TABLE(article character varying,
			  l0_name character varying,
			  l1_name character varying,
			  l2_name character varying,
			  l3_name character varying,
			  l4_name character varying,
			  brand character varying,
			  store_code character varying,
			  store_name character varying,
			  retail_facility_code character varying,
              currency_cd character varying,
			  channel character varying,
			  unit_capacity integer,
			  receipt_capacity integer,
			  carton_capacity integer,
			  store_inv integer,
			  net_capacity integer,
			  net_receipt_capacity integer,
              net_carton_capacity integer,
			  net_available integer,
              net_available_packs integer,
              net_available_eaches integer,
			  user_reserve_qty integer,
			  allocated_reserve_qty integer,
			  fwos numeric,
			  twos numeric,
			  carton_factor integer,
			  allocated_qty integer,
              loose_units_allocated integer,
              pack_units_allocated integer,
              packs_allocated_qty integer,
			  lw_qty integer,
			  lw_revenue real,
			  lw_margin integer,
			  sales_2_ago integer,
			  sales_3_ago integer,
			  sales_4_ago integer,
			  sales_5_ago integer
		)
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
   _l0_name varchar;
  	-- _cache_payload jsonb := jsonb_build_object('allocation_code', $1);
  	-- _cache_table_id text;
  	-- _cache_schema text := 'inventory_smart';
  	-- _cache_sp text := '.capacity_breach';
  	-- _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  	-- _cache_dependencies text[] := '{}';

    begin
            IF ($2 = '') IS FALSE
     THEN
        _article_filter = format($$AND article IN ('%s')$$, $2);
     END IF;

    CASE $3
            WHEN 'PO'
        THEN
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT a.article, a.dc_code, a.size, SUM(oh) oh, SUM(oh_packs) oh_packs, SUM(oh_eaches) oh_eaches
                    FROM (
                        SELECT article, dc_code, channel, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) a
                    LEFT JOIN inventory_smart.sku_po_available_units po --for specific PO
                    ON a.article = po.article  AND a.dc_code = po.po_code AND a.size = po.size
                    GROUP BY 1, 2, 3
                )
                ,other_allocations as (
                    SELECT article, dc_code, size,  SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated
                    FROM (
                        SELECT article, dc_code, channel, size FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) a
                    JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                ),
                final_inv_size as (
                    SELECT dc_code::int,
                           article,
                           size,
                           COALESCE(SUM(allocated_qty), 0) allocated_qty,
						   0 user_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available,
                           coalesce(SUM(oh_packs), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(packs_allocated_qty), 0) as net_available_packs,
                           coalesce(SUM(oh_eaches), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(loose_allocated_qty), 0) as net_available_eaches,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0)  as net_available_before_allocation
                    FROM (
                         SELECT dc_code,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty,
                                SUM(pack_units_allocated) pack_units_allocated,
                                SUM(loose_allocated_qty) loose_allocated_qty,
                                SUM(packs_allocated_qty)  filter (where type='S') as packs_allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT article,
                           SUM(allocated_qty) allocated_qty,
						   0 user_reserve_qty,
                           SUM(net_available) net_available,
                           MAX(net_available_packs) net_available_packs,
                           SUM(net_available_eaches) net_available_eaches,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1)

            $$;
        ELSE
            _final_inv_query := $$
                ,current_allocation as (
                    SELECT article, dc_code, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo, SUM(oh_packs) oh_packs, SUM(oh_eaches) oh_eaches
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
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,final_inv_size as (
                    SELECT dc_code,
                           article,
                           size,
                           COALESCE(SUM(allocated_qty), 0) allocated_qty,
						   COALESCE(SUM(user_reserve_qty), 0) user_reserve_qty,
						   COALESCE(SUM(allocated_reserve_qty), 0) allocated_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available,
                           coalesce(SUM(oh_packs), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(packs_allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_packs,
                           coalesce(SUM(oh_eaches), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(loose_allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_eaches,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available_before_allocation
                    FROM (
                         SELECT dc_code::int,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty,
                                SUM(pack_units_allocated) pack_units_allocated,
                                SUM(loose_allocated_qty) loose_allocated_qty,
                                SUM(packs_allocated_qty)  filter (where type='S') as packs_allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, article, size)
                    LEFT JOIN reserve_allocation USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
                )
                ,final_inv as (
                    SELECT article,
                           SUM(allocated_qty) allocated_qty,
						   SUM(user_reserve_qty) user_reserve_qty,
						   SUM(allocated_reserve_qty) allocated_reserve_qty,
                           SUM(net_available) net_available,
                           MAX(net_available_packs) net_available_packs,
                           SUM(net_available_eaches) net_available_eaches,
                           MIN(net_available) min_net_available
                    FROM final_inv_size
                    GROUP BY 1
                )
                --select * from final_inv;
            $$;
        -- no case for view past since we only have today's capacity
        END CASE;
        --raise notice '%', _final_inv_query;
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($1, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
      	select attribute_value into _l0_name from inventory_smart.plan_attributes pm WHERE plan_code = REPLACE($1, 'edit_', '') and attribute_name = 'l0_name';
        raise notice '_l0_name: %', _l0_name;

        _query_combine := format($$
           WITH base_table as (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE
                carfs.created_at between '%4$s'::timestamp and '%5$s'::timestamp
                and allocation_code = '%1$s' %2$s
            )
          --  select * from base_table;
            ,flat_table as (
                SELECT article,
                       store_code,
                       store_name,
                       js.key dc_code,
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
                       0 as pack_units_allocated,
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
                       0 as loose_allocated_qty,
                       'S' as type
               FROM packs
            )
            ,product_attributes as materialized(
            SELECT * FROM global.product_attributes_filter WHERE
				l0_name = any('%6$s'::varchar[]) and
				article IN (SELECT DISTINCT article FROM base_table)
			)
            ,store_size_allocations as (
                SELECT
                    article,
                    store_code,
                    size,
                    SUM(allocated_qty) allocated_qty,
                    -- JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) FILTER (WHERE type = 'S') packs_allocated_qty,
                    SUM(CASE WHEN type = 'E' THEN allocated_qty END) as loose_units_allocated,
                    SUM(CASE WHEN type = 'S' THEN allocated_qty END) as pack_units_allocated,
                    STRING_AGG(DISTINCT CASE WHEN type = 'S' THEN pack_type_id END, ',') as packs_allocated,
                    SUM(packs_allocated_qty) filter (where type='S') as packs_allocated_qty
                FROM
                    packs_base
                -- JOIN inventory_smart.ph_master pm USING(channel, article)
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
            ,article_store_level as (
                select
                    article,
                    store as store_code,
                    sum(allocated_total) as allocated_qty,
                    max(channel) as channel
                from base_table
                group by 1, 2
            ),
            article_carton_factor as (
                select
                    article,
                    store_code,
                    allocated_qty,
                    allocated_qty/COALESCE(bcf.carton_factor, 1) as carton_qty
                FROM article_store_level
                LEFT JOIN inventory_smart.brand_carton_factor bcf USING(article, channel)

            )
       		,store_dept_inv as (
       		     SELECT
       		         store_code,
       		         COALESCE(SUM(oh), 0) + COALESCE(SUM(it), 0)  + COALESCE(SUM(oo), 0) as store_inv
       		     FROM inventory_smart.latest_inventory li
       		     GROUP BY 1
       		 )
           --select * from store_dept_inv;
            ,store_capacity_and_allocation_reserve_and_store_inv as (
                 SELECT
       		         store_code,
       		         unit_capacity,
                     receipt_capacity,
                     carton_capacity,
                     COALESCE(allocated_qty, 0) as today_allocated_qty,
					 COALESCE(carton_allocated_qty, 0) as today_carton_qty,
					 COALESCE(tot_inv, 0) as store_inv
       		     FROM inventory_smart.store_unit_capacity
       		     WHERE store_code in (SELECT DISTINCT store_code FROM packs_base)
            )
       		,store_capacity as (
       		     SELECT
       		         store_code,
       		         unit_capacity,
                     receipt_capacity,
                     carton_capacity
       		     FROM inventory_smart.store_unit_capacity
       		     WHERE store_code in (SELECT DISTINCT store_code FROM packs_base)
       		 )
           --select * from store_capacity;
       		,store_allocations as (
       		     SELECT
       		         store_code,
					 SUM(allocated_qty) allocated_qty,
					 ceil(SUM(carton_qty)) carton_qty
       		     FROM article_carton_factor
				 GROUP BY 1
       		 )
           --select * from store_allocations;
           , today_allocation as (
                SELECT
       		         store_code,
					 allocated_qty as today_allocated_qty,
					 carton_allocated_qty as today_carton_qty
       		     FROM inventory_smart.store_unit_capacity
           )
		   ,capacity_breach as (
				SELECT * FROM (
					SELECT
						store_code,
						allocated_qty,
						unit_capacity,
						receipt_capacity,
                        carton_capacity,
						store_inv,
						COALESCE(today_allocated_qty, 0) as today_allocated_qty,
						COALESCE(unit_capacity, 0) - COALESCE(store_inv, 0) - COALESCE(allocated_qty, 0) - COALESCE(today_allocated_qty, 0) as net_capacity,
						COALESCE(receipt_capacity, 0) - COALESCE(allocated_qty, 0)  - COALESCE(today_allocated_qty, 0) as net_receipt_capacity,
                        COALESCE(carton_capacity, 0) - COALESCE(carton_qty, 0) - COALESCE(today_carton_qty, 0) as net_carton_capacity
					FROM store_allocations
					LEFT JOIN store_capacity_and_allocation_reserve_and_store_inv USING(store_code)
--					LEFT JOIN store_dept_inv USING(store_code)
--					LEFT JOIN store_capacity USING(store_code)
--					LEFT JOIN today_allocation USING(store_code)
				) foo
				WHERE net_capacity<0 or net_receipt_capacity<0 or net_carton_capacity<0
		   )
		   ,article_level_store as (
				SELECT
					article,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					store_code,
					store_name,
					retail_facility_code,
					currency_cd,
					channel,
					size,
					allocated_qty,
                    loose_units_allocated,
					pack_units_allocated,
					packs_allocated_qty
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
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					store_code,
					store_name,
					retail_facility_code,
					currency_cd,
					channel,
					unit_capacity::int,
					receipt_capacity::int,
                    carton_capacity::int,
					store_inv,
					net_capacity::int,
					net_receipt_capacity::int,
                    net_carton_capacity::int,
					fi.net_available::int,
                    fi.net_available_packs::int,
					fi.net_available_eaches::int,
					fi.user_reserve_qty::int,
					cb.today_allocated_qty::int as allocated_reserve_qty,
					fwos::numeric,
					wos.twos::numeric,
					COALESCE(bcf.carton_factor, 1) as carton_factor,
					SUM(als.allocated_qty)::int allocated_qty,
                    COALESCE(SUM(als.loose_units_allocated), 0)::int loose_units_allocated,
					COALESCE(SUM(als.pack_units_allocated), 0)::int pack_units_allocated,
					COALESCE(MAX(als.packs_allocated_qty), 0)::int packs_allocated_qty,
                	COALESCE(SUM(aid.lw_qty), 0)::int as lw_qty,
                	COALESCE(SUM(aid.lw_revenue), 0.0)::real as lw_revenue,
                	COALESCE(SUM(aid.lw_margin), 0)::int as lw_margin,
                	COALESCE(SUM(aid.sales_2_ago), 0)::int as sales_2_ago,
                	COALESCE(SUM(aid.sales_3_ago), 0)::int as sales_3_ago,
                	COALESCE(SUM(aid.sales_4_ago), 0)::int as sales_4_ago,
                	COALESCE(SUM(aid.sales_5_ago), 0)::int as sales_5_ago
				FROM article_level_store als
				LEFT JOIN inventory_smart.brand_carton_factor bcf using(article, channel)
				JOIN capacity_breach cb USING(store_code)
				LEFT JOIN final_inv fi USING (article) 
            	LEFT JOIN (SELECT * FROM inventory_smart.article_inventory_dashboard WHERE article IN (SELECT DISTINCT article FROM base_table))aid using(article, store_code, channel)
				LEFT JOIN wos_calcuations wos USING(article, store_code)
				GROUP BY 
					article,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					store_code,
					store_name,
					retail_facility_code,
					currency_cd,
					channel,
					unit_capacity,
					receipt_capacity,
                    carton_capacity,
					store_inv,
					net_capacity,
					net_receipt_capacity,
					net_carton_capacity,
					fi.net_available,
                    fi.net_available_packs,
					fi.net_available_eaches,
					fi.user_reserve_qty,
					cb.today_allocated_qty,
					fwos,
					wos.twos,
					carton_factor
      $$, $1, _article_filter, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes',_l0_name);

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
