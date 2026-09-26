--liquibase formatted sql
--changeset gokulakrishnan.nagarajan@impactanalytics.co:article_selection_list runOnChange:true stripComments:false splitStatements:false context:article_selection_list labels:article_selection_list
--comment: article_selection_list MTP-116916 include color column in select, added style-color desc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	declare
 		_query_pa text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_channel_filter text := inventory_smart.get_channel_str_from_input($3);
 		_store_active_filter text := '{"active": []}'::jsonb || $3;
 		_query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
        _query_sa_psm text := '';
        _ph_query text := '';
 		_product_filters jsonb := $2 ;
 		_query_table_filters text := '';
 		_query_combine_format text := '';
 		_query_combine text := '';
 		_query_combine_count_format text := '';
 		_query_combine_count text := '';
 		_sg_codes int4[] := $4;

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
        _ph_data_query text := '';
		_temp_query text := '';
		vl_unique_identifier text := $7;
		_rcl_input_query_format text:= '';
		_rcl_input_query text := '';
		_rcl_input_table text := '';
		_rcl_psm_resolved_table text := '';
		start_time timestamp;
        end_time timestamp;
        ph_data_id text := 'ph_data_' || uuid  || '';
        product_array text[] := '{}';
        prod_code text = '';
       _constraints_input_table text = '';
       _resolved_articles varchar[];

	ph_configuration_mapping text := '_ph_configuration_mapping_' || uuid || '';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;


 	begin
		_rcl_input_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		_constraints_input_table := 'public.rcl_constraint_input_data_' || vl_unique_identifier;
		_rcl_psm_resolved_table := 'public.rcl_psm_resolved_data_' || vl_unique_identifier;
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
		raise notice '_ph_sort : %', _ph_sort;
		raise notice ' _ph_search : %', _ph_search;
		raise notice ' _overall_search: %', _overall_search;
		raise notice '_limit : %', _limit;
		raise notice ' _offset: %', _offset;
        select * from inventory_smart.form_product_store_attribute_filter_query('dummy', $2, $3, 'global', 'product_store_attributes_filter_store_code') into _query_sa_psm, _ph_query;

 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  _product_filters
 		);

         _query_pa := _query_pa || _ph_search || _ph_sort;
		_ph_data_query :='select
 			        *
 			    from
 			    inventory_smart.ph_master
 				'|| _query_pa || ' ';
        _query_pa := replace(_query_pa, '%', '%%');
        _query_pa := _query_pa || ' %1$s';
 		raise notice ' _query_pa %', _query_pa;
        raise notice ' _query_sa_psm % ', _query_sa_psm;
         if (_channel_filter = '') IS FALSE then
         	_channel_filter := ' WHERE channel in  '||_channel_filter||' ' ;
         end if;

        --_ph_data_query := replace(_ph_data_query, '%', '%%');
        _query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';


       _rcl_input_query_format := '
			with store_group as (
				select pcm.* , sg.name
                    from (
                        select
                            ph.ph_code,
                            unnest(product_code_size_map) as product,
                            --pcms.channel,
							coalesce(pcms.default_store_group, '||default_sg_code||') as default_sg_code
                        from
                            %1$s ph
                        left join (
                			select ph_code, unnest(default_store_groups) default_store_group from ' || ph_configuration_mapping || '
						) pcms
						using(ph_code)
                    ) pcm
                    join global.store_groups sg on pcm.default_sg_code = sg.sg_code
                    where is_deleted = false
			),
			sgm as MATERIALIZED (
				select asgm.sg_code , psaf.store_code, psaf.psa_code from global.store_groups_mapping asgm
				join (
					select store_code, psa_code '||_query_sa_psm||'
				)psaf on asgm.store_code=psaf.store_code
			)
			select product->>''product_code'' as product_code, sgm.store_code, sgm.psa_code
                    from store_group esg
                    join sgm
                        on sgm.sg_code = esg.default_sg_code
                    group by 1, 2, 3';

 		_query_combine_format := 'with product_dc_map as (
                 SELECT ''po'' as po,
                       ph.ph_code,
                       channel,
                       article,
                       ph.product->>''product_code'' as product_code,
                       ph.product->>''size'' as size,
                       pmpd.dc_code
                       --mapping_code
                FROM (
                    SELECT ph_code,
                           channel,
                           article,
                           UNNEST(product_code_size_map) as product
                    FROM %7$s
                ) ph
                JOIN global.product_mapping_product_dc pmpd on ph.product->>''product_code'' = pmpd.product_code
                JOIN global.distribution_centres gdc using(dc_code)
                WHERE pmpd.is_active AND gdc.is_active AND NOT gdc.is_deleted
                )

            ,product_store_dc_mapping as (
                SELECT
                       --pmps.mapping_code,
                       pmps.product_code,
                       pmps.store_code,
                       ph_code,
					   ph.article as article,
                       pmsd.dc_code,
					   pdc.size
               	FROM %7$s ph
                JOIN %6$s pmps ON --pmps.l0_name = ph.l0_name AND
                pmps.product_code = ANY(ph.product_codes)
                JOIN product_dc_map pdc USING(ph_code)
                JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)
                --WHERE
                --pmps.l0_name IN (SELECT DISTINCT l0_name FROM %7$s) AND pmps.is_active = true AND CURRENT_DATE <@ pmps.validity AND
                --saf.active = true
				where pmsd.is_active
				group by 1,2,3,4,5,6
            )
			, product_dc_map_after_store_eligible as (
				select ph_code, product_code, size, article, dc_code
				from product_store_dc_mapping
				group by 1,2,3,4,5
			)
			,aid as (
				select psdm.ph_code, art.* from inventory_smart.article_inventory_dashboard art
				join (select ph_code, article, store_code from product_store_dc_mapping group by 1, 2, 3) psdm on psdm.article=art.article and psdm.store_code = art.store_code
			),
			txs_metrics as
			(
			select
			    ph_code,
				CAST(ROUND(SUM(COALESCE(lw_units, 0))) AS INTEGER) AS lw_units,
				CAST(ROUND(SUM(COALESCE(lw_margin, 0))) AS INTEGER) AS lw_margin,
				CAST(ROUND(SUM(COALESCE(lw_revenue, 0))) AS INTEGER) AS lw_revenue,
				--ROUND(CAST(COALESCE(SUM(l4w_units), 0) AS NUMERIC), 2) AS l4w_units,
				--ROUND(CAST(COALESCE(SUM(l4w_revenue), 0) AS NUMERIC), 2) AS l4w_revenue,
				--ROUND(CAST(COALESCE(SUM(l8w_units), 0) AS NUMERIC), 2) AS l8w_units,
                round(coalesce((sum(lw_revenue) / nullif( sum(lw_units), 0 )),0)::decimal,2) AS price,
				ROUND(CAST(COALESCE(COALESCE(SUM(msrp*discount)/NULLIF(SUM(msrp), 0), 0), 0) AS NUMERIC), 2) AS discount,
				--ROUND(CAST(COALESCE(COALESCE(SUM(msrp*promo)/NULLIF(SUM(msrp), 0), 0), 0) AS NUMERIC), 2) AS promo,
				--ROUND(CAST(COALESCE(COALESCE(SUM(sell_through_perc*(l8w_units+total_inv))/NULLIF(SUM(l8w_units+total_inv), 0), 0), 0) AS NUMERIC), 2) AS sell_through_perc,
                ROUND(CAST(CASE WHEN COUNT(*) != 0 THEN COUNT(CASE WHEN in_stock = 1 THEN 1 ELSE NULL END) / CAST(COUNT(*) AS FLOAT) ELSE 0 END AS NUMERIC), 2) AS in_stock_perc
			FROM aid
			group by 1
			)
 			--select * from product_store_dc_mapping
 			/*,product_store_mapping as (
                SELECT --mapping_code,
                       product_code,
                       store_code,
                       ph_code
                FROM product_store_dc_mapping
                GROUP BY 1, 2, 3
            )
			--select * from product_dc_map
 			, sku_dc_available_units as (
                SELECT ph_code,
                    article,
                    null pack_type_id,
                    SUM(oh) as oh,
                    SUM(oo) as oo,
                    SUM(it) as it,
                    JSONB_OBJECT_AGG(size, oh_map) as oh_map
                FROM (
                    SELECT ph_code, article, size,
                        JSONB_OBJECT_AGG(dc_code, oh) as oh_map,
                        COALESCE(SUM(oh), 0) oh,
                        COALESCE(SUM(oo), 0) oo,
                        COALESCE(SUM(it), 0) it
                    FROM (
                        SELECT * FROM product_dc_map_after_store_eligible
                        JOIN(
            				SELECT * FROM inventory_smart.sku_dc_available_units
            			) foo USING(product_code, channel, dc_code, article, size)
                	) foo GROUP BY 1, 2, 3
                ) foo GROUP BY 1, 2
            )
 			,sku_dc_reserved_units as (
            	SELECT ph_code, SUM(reserve_quantity) as reserve_quantity, JSONB_OBJECT_AGG(size, rq_map) as rq_map
            	FROM (
                	SELECT ph.ph_code,
                    	   ph.size,
                    	   SUM(quantity) as reserve_quantity,
                    	   JSONB_OBJECT_AGG(ph.dc_code, quantity) as rq_map
                	FROM product_dc_map_after_store_eligible ph
                    JOIN (
						SELECT article, channel, dc_code, size, coalesce(sum(quantity), 0) quantity
						FROM (
						    SELECT * from inventory_smart.sku_dc_reserved_units
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
                  	FROM product_dc_map_after_store_eligible ph
                    JOIN (
            			SELECT article,
            			       channel,
            			       dc_code,
            			       size,
            			       max(updated_at) updated_at,
            			       coalesce(sum(quantity), 0) quantity
            			from inventory_smart.sku_dc_allocated_units('''', ''%10$s'') sdau
						GROUP BY 1, 2, 3, 4
					) x
					USING(article, dc_code, size)
					GROUP BY 1, 2
				) t
				GROUP BY 1
            )*/
			,before_allocated as (
				select
					ph.ph_code,
					sum(eaches) as eaches,
					sum(packs) as packs
				from (select ph_code, article, dc_code from product_store_dc_mapping group by 1, 2, 3) ph
				join (
					select
						dpi.dc_code,
						dpi.article,
						case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end eaches,
						case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end packs
					from inventory_smart.dc_pack_inventory dpi
     				JOIN inventory_smart.dc_pack_configuration dpc
     				on
     					dpi.pack_type_id=dpc.pack_type_id
     					and dpi.article=dpc.article
     					and dpi.pack_type=dpc.pack_type
     			) dpi on
				dpi.article = ph.article and dpi.dc_code = ph.dc_code
				group by ph.ph_code
			)
			,inventory_details_product_dc_level as (
				select
					ph.product_code,
					ph.ph_code,
					ph.dc_code,
					ph.size,
					sda.oh as oh,
					sda.oo as oo,
					sda.it as it,
					--JSONB_OBJECT_AGG(dc_code, oh) as oh_map
					--JSONB_OBJECT_AGG(ph.dc_code, quantity) as au_map,
					coalesce(sku_reserv.quantity, 0 ) as total_reserve,
					coalesce(sdal.quantity, 0) as allocated_units,
					(oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
					coalesce(sdal.allocated_time, ladt.allocated_time, null) as allocated_time
					from product_dc_map_after_store_eligible ph
				join
					(
						select product_code, dc_code, size, article,
                            sum(coalesce(oh, 0)) as oh,
							sum(coalesce(oo, 0)) as oo,
							sum(coalesce(it, 0)) as it
                            from
                            inventory_smart.sku_dc_available_units
                            group by 1, 2, 3, 4
					) sda
				using (product_code, dc_code, article, size)
				left join(
					select product_code, dc_code, size, article,
					sum(coalesce(quantity, 0)) as quantity
					from 
					inventory_smart.sku_dc_reserved_units sku_reserv
					group by 1,2,3,4
				)sku_reserv
				using (product_code, dc_code, size, article)
				left join
 					(
						select article, dc_code, size,
						 max(updated_at) as allocated_time,
						coalesce(sum(quantity), 0) as quantity
                        from inventory_smart.sku_dc_allocated_units('''', ''%10$s'')
                        group by 1,2, 3
					) sdal
				on sdal.article = sda.article and sdal.dc_code = sda.dc_code and sdal.size = sda.size
				left join
 					(
						select article,
						max(last_allocation_date) as allocated_time
                        from inventory_smart.last_allocation_date_table ladt
                        group by 1
					) ladt
				on ladt.article = sda.article
				--group by ph.product_code, ph.dc_code
				--where (oh - coalesce(sku_reserv.quantity, 0) - coalesce(sdal.quantity, 0)) > 0
		)

			,agg_inventory_details as (
				select product_code, ph_code, size,
					JSONB_OBJECT_AGG(dc_code, oh) as oh_map,
					JSONB_OBJECT_AGG(dc_code, allocated_units) as au_map,
					JSONB_OBJECT_AGG(dc_code, total_reserve) as rq_map,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(total_reserve) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
					from inventory_details_product_dc_level
				group by 1, 2, 3

			)

			,final_inventory as (
				select ph_code,
					JSONB_OBJECT_AGG(size, oh_map) as oh_map,
					JSONB_OBJECT_AGG(size, au_map) as au_map,
					JSONB_OBJECT_AGG(size, rq_map) as rq_map,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(reserve_quantity) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
				from agg_inventory_details
				group by 1
			)
  			--select * from product_store_mapping;
            , constraint_data as (
            	SELECT ph_code,
                	   ROUND(AVG(aps)::numeric, 2) as aps,
                	   ROUND(AVG(wos)::numeric, 2) as wos,
					   ROUND(AVG(min_stock)::numeric, 2) as min_stock,
					   ROUND(AVG(max_stock)::numeric, 2) as max_stock,
					   ROUND(MIN(min_validator)::numeric, 2) as min_stock_validator,
					   Round(MAX(max_validator)::numeric, 2) as max_stock_validator,
                	   ARRAY_AGG(store_code) as mapped_stores,
                	   ARRAY_LENGTH(ARRAY_AGG(store_code), 1) as mapped_stores_count
            	FROM (
                	SELECT ph_code,
                    	   cm.store_code,
                    	   SUM(aps) as aps, --if there is null then it remains null and not considered in average
                    	   -- null + 1 = 1 -> one product code having null while other is not, will be considered
                    	   AVG(wos) as wos,
						   AVG(min_stock) as min_stock,
						   AVG(max_stock) as max_stock,
					       MIN(max_stock) as min_validator,
						   MAX(min_stock) as max_validator
                	FROM constraints_resolved_data_%9$s cm
                    JOIN  product_store_dc_mapping psm using(product_code, store_code)
                  	GROUP BY 1, 2
                ) foo
				GROUP BY 1
            )
						,woc_data as (
			    SELECT ph_code,
			           ROUND(AVG(woc)::numeric, 2) as woc,
			           ROUND(AVG(max_mod)::numeric, 2) as avg_max_mod,
			           ROUND(MIN(woc)::numeric, 2) as min_woc,
			           ROUND(MAX(woc)::numeric, 2) as max_woc,
			           COUNT(DISTINCT store_code) as woc_mapped_stores_count
			    FROM (
			        SELECT ph.ph_code,
			               psm.product_code,
			               psm.store_code,
			               wm.woc,
			               wm.max_mod
			        FROM %7$s ph
			        JOIN product_store_dc_mapping psm ON psm.ph_code = ph.ph_code
			        JOIN inventory_smart.woc_master wm 
			            ON wm.l4_name = ph.l4_name 
			            AND wm.store_code = psm.store_code
			        WHERE wm.woc IS NOT NULL
			    ) woc_detail
			    GROUP BY ph_code
			)
            ,product_profiles_ia as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', pp_code, ''name'', name, ''label'', special_classification) as iapp
            	FROM %7$s ph
                JOIN inventory_smart.product_profile_master ppm on ph.ph_code = ppm.ph_code
        		WHERE special_classification = ''ia-recommended''
            )

            ,article_dc_config as (
            	SELECT ph_code,
                    array_agg( distinct
 			            jsonb_build_object(
 			                ''value'', dc.dc_code, ''label'', dc.name,
 			                ''is_default'', true
 			            )
 			        )
					 as dcs
              	FROM product_store_dc_mapping
                JOIN global.distribution_centres dc using(dc_code)
              	GROUP BY 1
            )

            ,article_udpp_config as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', ppm.pp_code, ''name'', ppm.name, ''label'', ppm.special_classification) as udpp
            	FROM %7$s ph
                --JOIN inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)
                join %8$s pcm using(ph_code) --, channel)
                -- optimization - right  now ph_conf is small so doing the same join 3 times is ok
                -- when this data swells up, can join once and use thrice
                join inventory_smart.product_profile_master ppm
                on pcm.default_product_profile = ppm.pp_code
				join inventory_smart.product_profile_user_mapping_size ppums 
                on pcm.default_product_profile = ppums.pp_code and ppums.size = any(ph.sizes)
            )
            -- select * from article_udpp_config
            , article_sg_config as (
			  select
			    pcm.ph_code,
			    array_agg(
			      jsonb_build_object(
			        ''value'', sg_code, ''label'', name, ''is_default'',
			        true
			      )
			    ) as store_groups
			  from
			    (
			      select
			        ph.ph_code,
					coalesce(pcms.default_store_group, '||default_sg_code||') as default_sg_code
			      from
			        %7$s ph
					left join (
                			select ph_code, unnest(default_store_groups) default_store_group from ' || ph_configuration_mapping || '
						) pcms
					using(ph_code)
			    ) pcm
			    join global.store_groups sg on pcm.default_sg_code = sg.sg_code
				where sg.is_deleted=false
			  group by
			    1
			),
			inventory_stock_stats as (
				select
					ph.ph_code,
					ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) ,4) AS in_stock_perc,
					ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) AS dc_instock
				FROM inventory_smart.article_instock
				join %7$s ph using (article)
				group by 1
			), allocation_rule as (
				select dc_store_policy.ph_code, dspur.rule_code, dspur.values as alloc_rules
				from %8$s dc_store_policy
				join inventory_smart.dc_store_policy_user_rule dspur 
				on dc_store_policy.dc_store_rule = dspur.rule_code
			)
            ,final_result as (
            	SELECT %4$s as limit,
                	   ph.offset,
                 	   ph.l0_name,
                 	   ph.l1_name,
                 	   ph.l2_name,
                 	   ph.l3_name,
                	   ph.l4_name,
					   ph.l5_name,
					   ph.style_color_description,
					   ph.color,
--                 	   ph.style,
                 	   ph.article,
                 	   ph.ph_code,
                 	   ph.product_description,
                 	   ph.sizes,
                 	   ph.product_codes upc,
--					   ph.launch_date,
--					   ph.planned_clearance_date as clearance_date,
					   ph.product_lifecycle as product_life_cycle,
                 	   --ph.color,
                	   ph.article_status_tag,
                	   --ph.style_color_id,
                	   --ph.supersede_flag,
                	   --ph.brand,
                 	   STRING_TO_ARRAY(ph.channel, '','')  as channel,
                 	   --COALESCE(u.factor, 1) case_pack_qty,
                 	   COALESCE(reserve_quantity, 0) as reserve_quantity,
                 	   COALESCE(oh, 0) as oh,
                 	   COALESCE(oo, 0) as oo,
                 	   COALESCE(it, 0) as it,
                 	   null as pack_type_id,
                 	   --(COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) as total_inventory,
                 	   oh_map,
                 	   rq_map,
                 	   COALESCE(allocated_units, 0) as allocated_units,
                 	   ((COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)) as net_available_inventory,
                 	   au_map,
                 	   CASE WHEN udpp IS NULL THEN ARRAY[iapp || ''{"is_default": true}'']
                 	        WHEN iapp = udpp THEN ARRAY[iapp || ''{"is_default": true}'']
                 	       	ELSE ARRAY[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}'']
					   END as product_profiles,
                 	   allocated_time as "last_allocated",
                 	   dcs,
                 	   --CASE WHEN store_groups IS NULL THEN store_groups || jsonb_build_object(''value'', -1, ''label'', ''Default - Mapping'', ''is_default'', true)
                 	   --    	ELSE store_groups || JSONB_BUILD_OBJECT(''value'', -1, ''label'', ''Default - Mapping'', ''is_default'',
                       --            NOT TRUE IN (SELECT (a::jsonb->>''is_default'')::boolean FROM UNNEST(store_groups) as a)
                       --         )
                 	   --END as store_groups,
					   store_groups,
                 	   cd.mapped_stores_count,
                 	   cd.mapped_stores,
                 	   cd.aps,
                 	   --CAST(ROUND(cd.wos) as INTEGER) as wos,
                 	   CAST(ROUND(cd.min_stock) as INTEGER) as min_stock,
                 	   CAST(ROUND(cd.max_stock) as INTEGER) as max_stock,
                 	   CAST(ROUND(cd.min_stock_validator) as INTEGER) as min_stock_validator,
					   CAST(ROUND(cd.max_stock_validator) as INTEGER) as max_stock_validator,
						CAST(ROUND(wd.woc) as INTEGER) as wos,
						CAST(ROUND(wd.avg_max_mod) as INTEGER) as avg_max_mod,
						CAST(ROUND(wd.min_woc) as INTEGER) as min_woc,
						CAST(ROUND(wd.max_woc) as INTEGER) as max_woc,
                 	   tm.lw_units,
                 	   tm.lw_margin,
                 	   tm.lw_revenue,
					   tm.price,
                 	   --tm.l4w_units,
                 	   --tm.l4w_revenue,
                 	   --tm.l8w_units,
                 	   tm.discount,
                 	   --tm.promo,
                 	   --tm.sell_through_perc,
					   iss.in_stock_perc,
					   b_alloc.eaches as beginning_available_to_allocate_eaches,
					   b_alloc.packs as beginning_available_to_allocate_packs,
					   alloc_rule.alloc_rules as allocation_rules
                       --, ii.*
            	FROM %7$s ph
                JOIN article_sg_config asgc on ph.ph_code = asgc.ph_code
                --LEFT JOIN sku_dc_reserved_units ru on ph.ph_code = ru.ph_code
                --LEFT JOIN sku_dc_available_units avu on ph.ph_code = avu.ph_code
                --LEFT JOIN sku_dc_allocated_units alu on ph.ph_code = alu.ph_code
				left join final_inventory inv_info on inv_info.ph_code = ph.ph_code
                JOIN constraint_data cd on ph.ph_code = cd.ph_code
				LEFT JOIN woc_data wd on ph.ph_code = wd.ph_code
                LEFT JOIN product_profiles_ia ppi on ph.ph_code = ppi.ph_code
                -- todo verify
                JOIN article_dc_config adc on ph.ph_code = adc.ph_code
                LEFT JOIN article_udpp_config ppu on ph.ph_code = ppu.ph_code
                LEFT JOIN txs_metrics tm on ph.ph_code = tm.ph_code
				LEFT JOIN inventory_stock_stats iss on ph.ph_code = iss.ph_code
				left join before_allocated b_alloc on b_alloc.ph_code = ph.ph_code
                --LEFT JOIN inventory_stats ii on ii.article_stat = ph.article
                --LEFT JOIN inventory_smart.uom u on ph.style = u.item_id
                --LEFT JOIN allocated al on ph.article = al.article and ph.channel = al.channel
				left join allocation_rule alloc_rule on ph.ph_code = alloc_rule.ph_code
              	WHERE (COALESCE(oh, 0) - COALESCE(reserve_quantity, 0) - COALESCE(allocated_units, 0)) > 0
 			) %3$s';
 			WHILE _count > 0 AND _batch_count = 0 LOOP
 				_limit_clause := 'ORDER BY article  LIMIT ' || _limit || ' OFFSET ' || _offset;
                _temp_query := format('drop table if exists %1$s cascade;', ph_data_id);
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing first temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
                execute _temp_query;
				_temp_query := format(
					'create temp table %2$s as (
									with ph_data_without_offset as (
									select
										*
									from
										inventory_smart.ph_master
										join (select distinct article from inventory_smart.article_inventory_dashboard ) aid using (article)
									' || _query_pa || '
									)
									SELECT *, %3$s + ROW_NUMBER () OVER (' || replace(_ph_sort, '%', '%%') || ') as offset
										FROM ph_data_without_offset
									)',
					_limit_clause,
					ph_data_id,
					_offset
				);
				raise notice ' ph _Data query %', _temp_query;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing second temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				execute _temp_query;
                /*_temp_query := format('select product_code from %1$s', ph_data_id);
                for prod_code in select product_code from _temp_query
                LOOP
                    product_array := array_append(product_array, prod_code);
                end LOOP;
                */
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing drop table query for prod_data_'||vl_unique_identifier,'drop table if exists prod_data_'||vl_unique_identifier||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
                execute format('drop table if exists prod_data_%1$s cascade;', vl_unique_identifier);
                _temp_query := format('create unlogged table prod_data_%1$s as (select unnest(product_codes) as product_code from  %2$s);',vl_unique_identifier, ph_data_id);
                raise notice ' prod data query %', _temp_query;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing third temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

                execute _temp_query;
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing drop table query for '||ph_configuration_mapping,'drop table if exists '||ph_configuration_mapping||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
               	execute format('drop table if exists %1$s cascade', ph_configuration_mapping);
                _temp_query := format (
					'create temp table %1$s as (
									select array_agg(resolved_data.product_code) as product_codes,
											max(resolved_data.default_store_groups) as default_store_groups,
											max(resolved_data.default_product_profile) as default_product_profile,
											max(resolved_data.default_store_groups) as default_store_groups_selected,
											max(dc_store_rule) as dc_store_rule,
											psaf.article, psaf.ph_code
                                            from
									(
										select * from inventory_smart.generate_rcl_dc_store_policy(''prod_data_%2$s'', 10003, current_date)
                                    ) resolved_data
									join
									(
										select unnest(product_codes) as product_code,
											article, ph_code
										from inventory_smart.ph_master
									) psaf
									using (product_code)
									group by psaf.article, psaf.ph_code
								);',
					ph_configuration_mapping, vl_unique_identifier
				);
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing fourth temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

                raise notice 'ph  configuration data query : %', _temp_query;
                execute _temp_query;

				_rcl_input_query := format(_rcl_input_query_format, ph_data_id);
				raise notice '_rcl_input_query: %', _rcl_input_query;
				start_time := clock_timestamp();
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing drop table query for '||_rcl_input_table,'drop table if exists '||_rcl_input_table||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		


				execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
				_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' as ( ' || _rcl_input_query || ' );';
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing create table query for _rcl_input_query', _rcl_input_query, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				
				raise notice '_rcl_input_query: %', _rcl_input_query;
				execute _rcl_input_query;
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing drop table query for '||_rcl_psm_resolved_table, 'drop table if exists '|| _rcl_psm_resolved_table || ';', jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
				execute 'drop table if exists '|| _rcl_psm_resolved_table || ';';
				_temp_query := format('create unlogged table %2$s as (
					select * from global.generate_rcl_psm_data(''%1$s'', 101, current_date));', _rcl_input_table, _rcl_psm_resolved_table);
				--select product_code, store_code from %1$

                raise notice 'RCL resolution query : %', _temp_query;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing fifth temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

                execute _temp_query;
				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to resolve PSM::::  %', end_time - start_time;
				start_time := clock_timestamp();
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before dropping _constraints_input_table','drop table if exists '||_constraints_input_table||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				execute format('drop table if exists %1$s cascade;', _constraints_input_table);
				_temp_query := format('create unlogged table %1$s as (select psm.product_code, psm.store_code, psaf.psa_code, paf.article from %2$s psm
					join
						global.product_attributes_filter paf using (product_code)
					join
						global.product_store_attributes_filter psaf
						on paf.l0_name=psaf.l0_name and paf.l1_name = psaf.l1_name and psm.store_code=psaf.store_code
					);',
					_constraints_input_table, _rcl_psm_resolved_table);
				raise notice 'temp query for constraints  : %', _temp_query;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing sixth temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				execute _temp_query;
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before dropping table constraints_resolved_data_'||vl_unique_identifier ,'drop table if exists constraints_resolved_data_'||vl_unique_identifier||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
				_rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
					select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
				)', _constraints_input_table, vl_unique_identifier);
				raise notice ' constraints resolution query: % ', _rcl_input_query;
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'constraints resolution query' ,_rcl_input_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
				execute _rcl_input_query;
				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to resolve Constraints::::  %', end_time - start_time;
                execute format('select array_agg(distinct article) from constraints_resolved_data_%1$s', vl_unique_identifier) into _resolved_articles;
                _resolved_articles := coalesce(_resolved_articles, '{}');
                raise notice 'resolved articles: %', _resolved_articles;

        		start_time := clock_timestamp();

				_query_combine = format(
    			_query_combine_format,
					_limit_clause,
					_offset,
					_final_get,
					_limit,
					_rcl_psm_resolved_table,
					_rcl_psm_resolved_table,
					ph_data_id,
                    ph_configuration_mapping,
                    vl_unique_identifier,
                    _resolved_articles
				);
				raise notice 'Query ------- : %', _query_combine;

 				OPEN $1 SCROLL FOR EXECUTE _query_combine;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', '_query_combine' ,_query_combine,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

 				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to query combine::::  %', end_time - start_time;

 				-- Only way to get the count of items in the cursor`
 				MOVE FORWARD ALL FROM $1;
 				GET DIAGNOSTICS _batch_count := ROW_COUNT;
 				MOVE BACKWARD ALL FROM $1;

 				IF _batch_count = 0 THEN
 					_query_combine_count = format(_query_combine_count_format, _limit_clause);
 				    perform  global.sp_log(null, 'inventory_smart.article_selection_list', '_query_combine_count' ,_query_combine_count,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

					EXECUTE _query_combine_count INTO _count;
 				END IF;
 				_offset := _offset + _limit;
 				_limit := _limit + _limit;
 				IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
				
 			END LOOP;
			raise notice ' dropping the rcl input tables';
			--execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
			--execute 'drop table if exists ' || _rcl_psm_resolved_table ||' cascade; ';
 		RETURN $1;
 	end
 $function$
;