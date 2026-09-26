--liquibase formatted sql
--changeset liquibase:article_selection_list for steve madden runOnChange:true stripComments:false splitStatements:false context:MTP-55724 labels: MTP-55724
--comment: MTP-55724-detailscreen
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, character varying[], character[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, character varying[], character[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
/*
 * 
 * 
   Strategy Screen SP
  -------------------
  Inputs :- 
  ------
  $1 - refcursor
  $2 - ph_master attributes (product and article_status_tag)
  $3 - store attribute filters - mainly for channel
  $4 - integer list of store group ids - used when we had store group filter
  $5 - array of PO ids
  ----------
  SP Call :-
  ----------
    begin;
    select * from inventory_smart.article_selection_list('my_cur'::refcursor,
    '{"l0_name": [{"type": "list", "operator": "in", "values": ["Apparel"]}], "l1_name": [], "l2_name": [], "merchandise_category": [], "planning_ownership": [], "article_status_tag": [{"type": "list", "operator": "not in", "values": ["Old", "Retirement"]}]}',
    '{"channel": [{"type":"list", "operator":"in", "values": ["Outlet"]}]}',
    '{}',
    '{}',
    '{"search": [], "sort": [], "range": [], "limit": {"limit": 100, "page": 1}}');
    FETCH ALL IN "my_cur";
    commit;
------
   Docs :-
   ------
  Currently no cache is used
   Updated_by               Updated_on      Purpose
   ----------               -----------     --------
   Renugopal                 17-Feb-2023     Remove channel from join - inventory to base query, join with constraint speedup by adding l0_name 
 */
   declare
        _inv text := 'ph.dc_code';
        _inventory_query text := '';
        _po_id text := '';
        _po_filter text := '';
        _store_active_filter text := '{"active": []}'::jsonb || $3;-- to consider only active stores
        _query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
        _query_sa_dc text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb - 'dc_flag');
        _article_dc_config text := '';
        _dc_mapping_reserve_inventory text :='';
        _query_pa text := '';
        _channel text := inventory_smart.get_channel_from_input($3);
        
        _product_filters jsonb := $2  || ('{"channel": [{"type": "list", "operator": "in", "values": ["' || _channel || '"]}]}')::jsonb;
        _query_table_filters text := '';
        _query_combine_format text := '';
        _query_combine text := '';
        _query_combine_count_format text := '';
        _query_combine_count text := '';
        _sg_codes varchar[] := $4;
        
        _final_get text := ' SELECT DISTINCT * FROM final_result';
        _final_count text := ' SELECT COUNT(*) FROM (SELECT DISTINCT * FROM final_result) sq';
        _count int := 1;
        _batch_count int := 0;
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _limit_clause text := '';
        _sg_query text := '';
        _sg_join text := 'LEFT';
    begin     
        -- _channel := replace(_channel, '%', '%%');
		raise notice 'Query sa dc: %', _query_sa_dc;
		raise notice 'Query sa filter: %', _store_active_filter;
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
        _query_pa := inventory_smart.form_main_table_filters('ph_master', _product_filters);        
        raise notice ' % product filters ---->>>>>>>>>%', _product_filters, $2;
        _query_pa := _query_pa || _ph_search || $$ AND article_status_tag NOT IN ('Only Store Inventory', 'No Network Inventory') $$ || _ph_sort || '%1$s';
        if coalesce(array_length(_sg_codes, 1), 0) != 0
        then
--          _sg_query := format($$where default_store_groups @> %s::int4[]$$, concat(_sg_codes));
            _sg_query := format($$where default_store_groups && (select array_agg(sg_code) from global.store_groups where name = any('%s'::varchar[]))$$, _sg_codes::varchar[]);
            _sg_join := '';
        end if;
		raise notice 'SG test Query : %', _sg_query;
		raise notice 'SG test Codes : %', _sg_codes;
        _query_combine_count_format := '
        SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';
        _query_combine_format := $$
            WITH ph_data_without_offset as (
                SELECT * FROM inventory_smart.ph_master %1$s
            )
            ,ph_data as (
                SELECT *, %2$s + ROW_NUMBER () OVER (%5$s) as offset
                FROM ph_data_without_offset
            )
            --select * from ph_data
            ,product_dc_map as (
                SELECT 'po' as po,
                       ph.ph_code,
                       channel,
                       article,
                       ph.product->>'product_code' as product_code,
                       ph.product->>'size' as size,
                       pmpd.dc_code,
                       mapping_code
                FROM (
                    SELECT ph_code,
                           channel,
                           article,
                           UNNEST(product_code_size_map) as product
                    FROM ph_data
                ) ph
                JOIN global.product_mapping_product_dc pmpd on ph.product->>'product_code' = pmpd.product_code
                JOIN global.distribution_centres gdc using(dc_code)
                WHERE gdc.is_active AND NOT gdc.is_deleted AND gdc.linked_store_code IN (with temp as (%10$s) select store_code from temp)
            )
            --select * from product_dc_map
            , sku_dc_available_units as (
                select 
                    ph_code,
                    pack_type_id, 
                    pack_description,
                    sum(oh) as oh, 
                    sum(oo) as oo, 
                    sum(it) as it, 
                    JSONB_OBJECT_AGG(size, oh_map) as oh_map 
                from 
			    (
			      select ph.ph_code, ph.size, pack_type_id, pack_description, JSONB_OBJECT_AGG(ph.dc_code, oh) as oh_map, coalesce(SUM(oh), 0) oh ,
                      COALESCE(SUM(oo), 0) oo,
                      COALESCE(SUM(it), 0) it
			      from product_dc_map ph 
			      join 
						(
                    select * from (
                	select article, channel, array_agg(distinct pack_type_id) pack_type_id, array_agg(pack_description) pack_description
									from inventory_smart.sku_dc_available_units
									where type = 'S'
									group by 1, 2
                ) a
                right join 
                (
                    select
                      article,
                      channel,
                      dc_code,
                      size,
                      coalesce(sum(oh), 0) oh,
                      COALESCE(SUM(oo), 0) oo,
                      COALESCE(SUM(it), 0) it
                    from
                      inventory_smart.sku_dc_available_units sdau
                    group by 1,2,3,4
                ) b
                using (article, channel)
          	) x
					using (article,channel,dc_code,size)  
			   group by 1, 2, 3, 4
			    ) as t 
				--where pack_type_id is not null
			  group by 
			    1,2,3
			)
            --    select * from sku_dc_available_units
            ,sku_dc_reserved_units as (
            	SELECT ph_code, SUM(reserve_quantity) as reserve_quantity, JSONB_OBJECT_AGG(size, rq_map) as rq_map
            	FROM (
                	SELECT ph.ph_code, 
                    	   ph.size, 
                    	   SUM(quantity) as reserve_quantity, 
                    	   JSONB_OBJECT_AGG(ph.dc_code, quantity) as rq_map
                	FROM product_dc_map ph 
                    JOIN (
						SELECT article, channel, dc_code, size, coalesce(sum(quantity), 0) quantity
						FROM (
						    SELECT * from inventory_smart.sku_dc_reserved_units((select array_agg(product_code) from product_dc_map), '{}')
						) x 
						GROUP BY 1, 2, 3, 4
					) x
					USING(article, dc_code, size)
					GROUP BY 1, 2
                ) as t 
				GROUP BY 1
            )
            --select * from sku_dc_reserved_units
            ,sku_dc_allocated_units as (
            	SELECT ph_code, 
                	   SUM(allocated_units) as allocated_units, 
                	   JSONB_OBJECT_AGG(size, au_map) as au_map, 
                	   MAX(allocated_time) as allocated_time 
              	FROM (
                	SELECT ph.ph_code, 
                    	   ph.size, 
                    	   SUM(quantity) as allocated_units, 
                    	   JSONB_OBJECT_AGG(ph.dc_code, quantity) as au_map, 
                    	   max(updated_at) as allocated_time 
                  	FROM product_dc_map ph 
                    JOIN (
            			SELECT article,
            			       channel,
            			       dc_code,
            			       size,
            			       max(updated_at) updated_at,
            			       coalesce(sum(quantity), 0) quantity
            			FROM inventory_smart.sku_dc_allocated_units sdau
						GROUP BY 1, 2, 3, 4
					) x
					USING(article, dc_code, size)
					GROUP BY 1, 2
				) t
				GROUP BY 1
            )
            --select * from sku_dc_allocated_units
            ,product_store_dc_mapping as (
                SELECT pmps.mapping_code, 
                       pmps.product_code,
                       pmps.store_code, 
                       ph_code,
                       saf.channel,
                       pmsd.dc_code
               	FROM ph_data ph 
                JOIN global.product_mapping_product_store pmps ON pmps.l0_name = ph.l0_name AND pmps.product_code = ANY(ph.product_codes) 
                JOIN (%6$s) saf USING(store_code)
                JOIN product_dc_map USING(ph_code)
                JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)  
                WHERE pmps.l0_name IN (SELECT DISTINCT l0_name FROM ph_data) AND pmps.is_active = true AND CURRENT_DATE <@ pmps.validity AND saf.active = true
            )
             --select * from product_store_dc_mapping
            ,product_store_mapping as ( 
                SELECT mapping_code,
                       product_code,
                       store_code,
                       ph_code
                FROM product_store_dc_mapping
                GROUP BY 1, 2, 3, 4
            )
            --select * from product_store_mapping;
            ,constraint_data as (
            	SELECT ph_code, 
                	   ROUND(AVG(aps)::numeric, 2) as aps, 
                	   ROUND(AVG(wos)::numeric, 2) as wos, 
                	   ARRAY_AGG(store_code) as mapped_stores, 
                	   ARRAY_LENGTH(ARRAY_AGG(store_code), 1) as mapped_stores_count 
            	FROM (
                	SELECT ph_code, 
                    	   cm.store_code, 
                    	   SUM(aps) as aps, --if there is null then it remains null and not considered in average
                    	   -- null + 1 = 1 -> one product code having null while other is not, will be considered
                    	   AVG(wos) as wos 
                	FROM product_store_mapping psm 
                    --left join inventory_smart.constraint_master cm using(mapping_code) 
                    JOIN inventory_smart.constraint_master cm using(mapping_code) 
                  	WHERE channel = '%7$s'
                  	GROUP BY 1, 2
                ) foo 
				GROUP BY 1
            )
            --select * from constraint_data
            ,product_profiles_ia as (
            	SELECT ph.ph_code, 
                	   JSONB_BUILD_OBJECT('value', pp_code, 'name', name, 'label', special_classification) as iapp 
            	FROM ph_data ph 
                JOIN inventory_smart.product_profile_master ppm using(ph_code) 
        		WHERE special_classification = 'ia-recommended'
            )
            --select * from product_profiles_ia
            , selected_dc_data as (
            	SELECT ph_code, 
                	   dc.dc_code, 
                	   dc.name 
              	FROM product_store_dc_mapping
                JOIN global.distribution_centres dc using(dc_code) 
              	GROUP BY 1, 2, 3
            )
            --select * from selected_dc_data
            ,article_dc_config as (
            	SELECT sdc.ph_code, 
                	   ARRAY_AGG(JSONB_BUILD_OBJECT('value', dc_code,
						   			  	   		    'label', name, 
                	         			    		'is_default', (CASE WHEN default_dc_code IS NULL THEN false ELSE true END))
                	   ) as dcs 
            	FROM (
                	SELECT ph.ph_code, 
						   UNNEST(default_dcs) as default_dc_code 
                	FROM ph_data ph 
                    JOIN inventory_smart.ph_configuration_mapping pcm USING(ph_code, channel)
                ) pcm 
                RIGHT JOIN selected_dc_data sdc on pcm.ph_code = sdc.ph_code and pcm.default_dc_code = sdc.dc_code 
              	GROUP BY 1
            )
            ,article_udpp_config as (
            	SELECT ph.ph_code, 
                	   JSONB_BUILD_OBJECT('value', pp_code, 'name', name, 'label', special_classification) as udpp 
            	FROM ph_data ph 
                JOIN inventory_smart.ph_configuration_mapping pcm using(ph_code, channel) 
                -- optimization - right  now ph_conf is small so doing the same join 3 times is ok
                -- when this data swells up, can join once and use thrice
                join inventory_smart.product_profile_master ppm on pcm.default_product_profile = ppm.pp_code
            )
            -- select * from article_udpp_config 
            ,sg_level as (
                select
                        ph_code,
                        default_sg_code,
                        name,
                        case
                                when s.default_sg_code = any(default_store_groups_selected) then true
                                else false
                        end as is_selected
                from
                        (
                        select
                                ph_code,
                                unnest(default_store_groups) as default_sg_code ,
                                default_store_groups_selected
                        from
                                inventory_smart.ph_configuration_mapping pc
                        join ph_data pm
                                        using(ph_code,
                                channel)
                        %8$s
                )s
                join global.store_groups sg on
                        sg.sg_code = s.default_sg_code
                )
                ,article_sg_config as (
                        select
                                ph_code,
                                ARRAY_AGG(JSONB_BUILD_OBJECT('value', default_sg_code, 'label', name, 'is_default', is_selected)) as store_groups
                        from
                                sg_level
                        group by
                                1
            )
            ,inventory_stats as (
                SELECT article,
                       COALESCE(SUM(week_to_date_sales), 0) as week_to_date_sales, 
                       COALESCE(SUM(last_day_sales), 0) as last_day_sales, 
                       ROUND(COALESCE(AVG(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc,
                       COALESCE(SUM(lw_qty), 0) lw_qty,
                       ROUND(COALESCE(AVG(si) * 100, 0)::decimal, 2) as si,
                       COALESCE(SUM(sales_1_ago), 0) sales_1_ago,
                       COALESCE(SUM(sales_2_ago), 0) sales_2_ago,
                       COALESCE(SUM(sales_3_ago), 0) sales_3_ago,
                       COALESCE(SUM(sales_4_ago), 0) sales_4_ago
                FROM inventory_smart.article_inventory_dashboard
                WHERE channel = '%7$s' AND article IN (SELECT article FROM ph_data)
                GROUP BY 1
            )
            --select * from article_sg_config
			,article_packs as (
            	select 
              	ph.article, 
              	STRING_AGG(DISTINCT dpc.parent_article, ',') as pack_id,
              	STRING_AGG(DISTINCT dpc.pack_description, ',') as pack_description
              FROM inventory_smart.dc_pack_configuration dpc
              join ph_data ph USING (article)
              GROUP BY ph.article
            )
            ,final_result as (
            	SELECT %4$s as limit,
                	   ph.offset,
                 	   ph.l0_name, 
                 	   ph.l1_name, 
                 	   ph.l2_name, 
                 	   ph.l3_name, 
                	   ph.l4_name, 
                 	   ph.style_name, 
                 	   ph.article,
                 	   ph.ph_code,
                 	   ph.product_description, 
                 	   ph.sizes, 
                 	   ph.product_codes upc, 
                	   ph.article_status_tag,
					   ap.pack_id,
              		   ap.pack_description,
                 	   STRING_TO_ARRAY(ph.channel, ',')  as channel, 
                 	   COALESCE(u.factor, 1) case_pack_qty,
                 	   COALESCE(reserve_quantity, 0) as reserve_quantity, 
                 	   COALESCE(oh, 0) as oh,
                 	   COALESCE(oo, 0) as oo,
                 	   COALESCE(it, 0) as it,
                 	   (COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) as total_inventory, 
                 	   oh_map, 
                 	   rq_map, 
                 	   COALESCE(allocated_units, 0) as allocated_units, 
                 	   ((COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)) as net_available_inventory, 
                 	   au_map,
                 	   CASE WHEN udpp IS NULL THEN ARRAY[iapp || '{"is_default": true}']
                 	        WHEN iapp = udpp THEN ARRAY[iapp || '{"is_default": true}']
                 	       	ELSE ARRAY[udpp || '{"is_default": true}', iapp || '{"is_default": false}']
					   END as product_profiles, 
                 	   DATE(allocated_time AT TIME ZONE 'EST'::text) allocated_time, 
                 	   dcs, 
                 	   CASE WHEN store_groups IS NULL THEN store_groups || jsonb_build_object('value', -1, 'label', 'Default - Mapping', 'is_default', true)
                 	       	ELSE store_groups || JSONB_BUILD_OBJECT('value', -1, 'label', 'Default - Mapping', 'is_default', 
                                   NOT TRUE IN (SELECT (a::jsonb->>'is_default')::boolean FROM UNNEST(store_groups) as a)
                                )
                 	   END as store_groups, 
                 	   cd.mapped_stores_count, 
                 	   cd.mapped_stores, 
                 	   cd.aps, 
                 	   cd.wos,
                       ii.*
            	FROM ph_data ph 
                %9$s JOIN article_sg_config asgc on ph.ph_code = asgc.ph_code 
                LEFT JOIN sku_dc_reserved_units ru on ph.ph_code = ru.ph_code 
                LEFT JOIN sku_dc_available_units avu on ph.ph_code = avu.ph_code 
                LEFT JOIN sku_dc_allocated_units alu on ph.ph_code = alu.ph_code 
                LEFT JOIN constraint_data cd on ph.ph_code = cd.ph_code 
                LEFT JOIN product_profiles_ia ppi on ph.ph_code = ppi.ph_code 
                JOIN article_dc_config adc on ph.ph_code = adc.ph_code 
                LEFT JOIN article_udpp_config ppu on ph.ph_code = ppu.ph_code 
                LEFT JOIN inventory_stats ii on ii.article = ph.article
				LEFT JOIN article_packs ap on ap.article = ph.article
                LEFT JOIN inventory_smart.uom u on ph.l4_name = u.item_id
              	WHERE (COALESCE(oh, 0) - COALESCE(allocated_units, 0) ) > 0
            ) %3$s $$;
            WHILE _count > 0 AND _batch_count = 0 LOOP
                _limit_clause := ' LIMIT ' || _limit || ' OFFSET ' || _offset;
                _query_combine = format(_query_combine_format,
                                        format(_query_pa, _limit_clause),
                                        _offset,
                                        _final_get,
                                        _limit,
                                        _ph_sort,
                                        _query_sa,
                                        _channel,
                                        _sg_query,
                                        _sg_join,
                                        _query_sa_dc);        
                raise notice 'A: %', _query_combine;
                OPEN $1 SCROLL FOR EXECUTE _query_combine;
                --raise notice 'A: %', _query_combine;
                
                -- Only way to get the count of items in the cursor`
                MOVE FORWARD ALL FROM $1;
                GET DIAGNOSTICS _batch_count := ROW_COUNT;
                MOVE BACKWARD ALL FROM $1;
                
                IF _batch_count = 0 THEN
                    _query_combine_count = format(_query_combine_count_format, _limit_clause);
                    EXECUTE _query_combine_count INTO _count;
                END IF;
                _offset := _offset + _limit;
                _limit := _limit + _limit;
                IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
            END LOOP;
        RETURN $1;
    end
$function$
;
