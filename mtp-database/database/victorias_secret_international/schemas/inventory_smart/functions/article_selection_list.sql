--liquibase formatted sql
--changeset nibeel:article_selection_list runOnChange:true stripComments:false splitStatements:false context:MTP-82374  labels:MTP-82374
--comment: MTP-82374
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code int);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer DEFAULT NULL::integer)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	declare
 		_query_pa text := '';
		_store_active_filter text := '{"active": []}'::jsonb || $3;
 		_query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
        _query_sa_psm text := '';
        _ph_query text := '';
 		_product_filters jsonb := $2 ;
 		_query_combine_format text := '';
 		_query_combine text := '';
 		_query_combine_count_format text := '';
 		_query_combine_count text := '';
 		_sg_codes int4[] := $4;

		_final_get text := ' SELECT DISTINCT * FROM final_result';
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
		_supply_route_query text := '';
		_rcl_input_table text := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		_rcl_psm_resolved_table text := 'public.rcl_psm_resolved_data_' || vl_unique_identifier;
		_constraints_input_table text = 'public.rcl_constraint_input_data_' || vl_unique_identifier;
		_supply_route_table text := 'public.supply_route_locations_' || vl_unique_identifier;
		_result_table text := 'result_table_' || vl_unique_identifier || '';
		start_time timestamp;
		end_time timestamp;

		ph_data_id text := 'ph_data_' || uuid  || '';
		product_array text[] := '{}';
		prod_code text = '';

		ph_configuration_mapping text := '_ph_configuration_mapping_' || uuid || '';
		_channel_product_filters jsonb := '{}' ;
        _resolved_articles varchar[];
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
		_count_check int;


 	begin
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
        select * from inventory_smart.form_product_store_attribute_filter_query('dummy', $2, $3, 'global', 'product_store_attributes_filter_store_code') into _query_sa_psm, _ph_query;

		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  _product_filters
 		);

        _query_pa := _query_pa || _ph_search || _ph_sort;
		raise notice 'final _query_pa: %', _query_pa;

		_ph_data_query :='select
 			        *
 			    from
 			    inventory_smart.ph_master
 				'|| _query_pa || ' ';
        _query_pa := replace(_query_pa, '%', '%%');
        _query_pa := _query_pa || ' %1$s';
        _query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';
        _rcl_input_query_format := '
			with store_group as (
				select pcm.* , sg.name
                    from (
                        select
                            ph.ph_code,
                            unnest(product_code_size_map) as product,
							ph.l0_name,
                            --pcms.channel,
							pcms.default_store_group as default_sg_code
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
						select asgm.sg_code , psaf.store_code, psaf.psa_code, psaf.l0_name from global.store_groups_mapping asgm
                    	join (
							select store_code, psa_code, l0_name '||_query_sa_psm||'
						)psaf on asgm.store_code=psaf.store_code
						join global.store_master sm
            			on psaf.store_code = sm.store_code and sm.active
			)
			select
				product->>''product_code'' as product_code, sgm.store_code, sgm.psa_code
			from store_group esg
			join sgm
                        on sgm.sg_code = esg.default_sg_code and sgm.l0_name = esg.l0_name
                    group by 1, 2, 3';

		_supply_route_query :=  '
	 			with node_list as(
  					select
    					nwl.*,
    					product_code
  					from inventory_smart.rcl_network_versions_latest nwl
  					join '|| ph_data_id ||' using (article)
  					cross join unnest(product_codes) as product_code
  					where supply_route_name in (''DC-Store'', ''DC-DC Allocation'')
				),
				location_list as(
					SELECT DISTINCT article, product_code, source_type as type, source_code AS location
					FROM node_list
					UNION
					SELECT DISTINCT article, product_code, destination_type as type, destination_code AS location
					FROM node_list
				)
				SELECT *
				FROM location_list ll
				WHERE
  				ll.type != ''Store''
  				OR EXISTS (
    				SELECT 1
   					FROM ' || _rcl_psm_resolved_table || ' psm
   					WHERE psm.product_code = ll.product_code AND psm.store_code = ll.location
  				)';

 		_query_combine_format := 'with product_dc_map as materialized(
                SELECT
                       ph.ph_code,
                       ph.channel,
                       ph.article,
                       ph.product_code,
                       ph.size,
                       gdc.dc_code,
                       gdc.name
                FROM (
                    SELECT ph_code,
					       channel,
					       article,
					       pmap.value->>''product_code'' as product_code,
					       pmap.value->>''size'' as size
					FROM %7$s base,
					     unnest(base.product_code_size_map) AS pmap(value)
                ) ph
                JOIN  ' || _supply_route_table || ' srl on ph.product_code = srl.product_code
                JOIN global.distribution_centres gdc on srl.location =  gdc.linked_store_code
                WHERE srl.type = ''DC'' AND gdc.is_active AND NOT gdc.is_deleted
            )
            ,product_store_dc_mapping as (
                SELECT
                       pmps.product_code,
                       pmps.location as store_code,
                       pdc.ph_code,
					   pdc.article as article,
                       pdc.dc_code,
					   pdc.size,
					   pdc.name
				FROM product_dc_map pdc
                JOIN ' || _supply_route_table || ' pmps ON pmps.product_code = pdc.product_code
				where pmps.type != ''DC''
            )
			, product_dc_map_after_store_eligible as materialized(
				select ph_code, product_code, size, article, dc_code
				from product_store_dc_mapping
				group by 1,2,3,4,5
			)
			,aid as (
				select
					psdm.ph_code,
					art.last_week_sales,
					art.l4w_avg_sales,
					art.aur
				from inventory_smart.article_inventory_dashboard art
				join (select ph_code, article, store_code from product_store_dc_mapping group by 1, 2, 3) psdm on psdm.article=art.article and psdm.store_code = art.store_code
			)
			,txs_metrics as(
				select
			    	ph_code,
					COALESCE(SUM(last_week_sales), 0)::int as last_week_sales,
					COALESCE(SUM(l4w_avg_sales), 0)::int as last_4_week_sales,
					COALESCE(Avg(aur), 0)::int as aur
				FROM aid
				group by 1
			)
			,sku_dc_reserved_units as (
				SELECT pmpd.product_code,
				    paf.article,
				    paf.size,
				    pmpd.dc_code,
				    sum(drq.quantity) AS quantity,
				    1 AS units_in_pack
				FROM inventory_smart.dc_reserve_quantity drq
				JOIN product_dc_map_after_store_eligible pmpd USING (product_code, dc_code)
				JOIN (select article, unnest(sizes) as size, unnest(product_codes) as product_code from %7$s) paf USING (product_code)
			  	GROUP BY pmpd.product_code, paf.article, paf.size, pmpd.dc_code--, drq.type, drq.channel
			)
			,inventory_details_product_dc_level as (
				select
					ph.article,
					ph.product_code,
					ph.ph_code,
					ph.dc_code,
					ph.size,
					sda.oh as oh,
					sda.oo as oo,
					sda.it as it,
					sda.oh_oo as oh_oo,
					sda.oh as begining_oh,
					coalesce(sku_reserv.quantity, 0 ) as total_reserve,
					coalesce(sdal.quantity, 0) as allocated_units,
					(sda.oh_oo -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh_oo,
					(sda.oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,
					(sda.oo -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oo,
					coalesce(sdal.allocated_time, null) as allocated_time
					from product_dc_map_after_store_eligible ph
				join
					(
						select product_code, dc_code, size, article,
                            sum(coalesce(oh, 0)) as oh,
							sum(coalesce(oo, 0)) as oo,
							sum(coalesce(it, 0)) as it,
							SUM(COALESCE(oh, 0) + COALESCE(oo, 0)) AS oh_oo
                            from
                            inventory_smart.sku_dc_available_units
                            group by 1, 2, 3, 4
					) sda
				using (product_code, dc_code, article, size)
				left join
					sku_dc_reserved_units sku_reserv
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
			--	left join
 			--		(
			--			select article,
			--			max(last_allocation_date) as allocated_time
            --          from inventory_smart.last_allocation_date_table ladt
            --            group by 1
			--		) ladt
			--	on ladt.article = sda.article
				where (sda.oh_oo - coalesce(sku_reserv.quantity, 0) - coalesce(sdal.quantity, 0)) > 0
			)
			,agg_inventory_details as (
				select article, product_code, ph_code, size,
					JSONB_OBJECT_AGG(dc_code, oh) as oh_map,
					JSONB_OBJECT_AGG(dc_code, allocated_units) as au_map,
					JSONB_OBJECT_AGG(dc_code, total_reserve) as rq_map,
					sum(oh) as oh,
					sum(begining_oh) as begining_oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(oh_oo) as oh_oo,
					sum(total_reserve) as reserve_quantity,
					sum(net_available_inventory_oh_oo) as net_available_inventory_oh_oo,
					sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(net_available_inventory_oo) as net_available_inventory_oo,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
					from inventory_details_product_dc_level
				group by 1, 2, 3, 4

			)
			,final_inventory as (
				select article, ph_code,
					JSONB_OBJECT_AGG(size, oh_map) as oh_map,
					JSONB_OBJECT_AGG(size, au_map) as au_map,
					JSONB_OBJECT_AGG(size, rq_map) as rq_map,
					array_agg(size) as sizes,
					sum(oh) as oh,
					sum(begining_oh) as begining_oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(oh_oo) as oh_oo,
					sum(reserve_quantity) as reserve_quantity,
					sum(net_available_inventory_oh_oo) as net_available_inventory_oh_oo,
					sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(net_available_inventory_oo) as net_available_inventory_oo,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
				from agg_inventory_details
				group by 1, 2
			)
			,constraint_data_flat AS (
    			SELECT
        			ph_code,
        			srl.type,
        			SUM(cm.aps) AS aps,
        			AVG(cm.wos) AS wos,
        			AVG(cm.min_stock) AS min_stock,
        			AVG(cm.max_stock) AS max_stock,
        			MIN(cm.max_stock) AS min_stock_validator,
        			MAX(cm.min_stock) AS max_stock_validator,
        			cm.store_code
    			FROM constraints_resolved_data_%9$s cm
    			JOIN product_store_dc_mapping psm ON cm.product_code = psm.product_code AND cm.store_code = psm.store_code
    			LEFT JOIN ' || _supply_route_table || ' srl ON cm.product_code = srl.product_code AND cm.store_code = srl.location
    			GROUP BY psm.ph_code, srl.type, cm.store_code
			),
			constraint_data AS (
    			SELECT
        			ph_code,
        			SUM(COALESCE(aps, 0)) AS aps,

        			-- Store
        			AVG(CASE WHEN type = ''Store'' THEN min_stock END) AS store_min_stock,
        			AVG(CASE WHEN type = ''Store'' THEN max_stock END) AS store_max_stock,
        			AVG(CASE WHEN type = ''Store'' THEN wos END) AS store_wos,
        			MIN(CASE WHEN type = ''Store'' THEN min_stock_validator END) AS store_min_stock_validator,
        			MAX(CASE WHEN type = ''Store'' THEN max_stock_validator END) AS store_max_stock_validator,

        			-- L-Site
        			MAX(CASE WHEN type = ''L-Site'' THEN min_stock END) AS l_site_min_stock,
        			MAX(CASE WHEN type = ''L-Site'' THEN max_stock END) AS l_site_max_stock,
        			MAX(CASE WHEN type = ''L-Site'' THEN wos END) AS l_site_wos,
        			MIN(CASE WHEN type = ''L-Site'' THEN min_stock_validator END) AS l_site_min_stock_validator,
        			MAX(CASE WHEN type = ''L-Site'' THEN max_stock_validator END) AS l_site_max_stock_validator,

       				-- R-Site
        			MAX(CASE WHEN type = ''R-Site'' THEN min_stock END) AS r_site_min_stock,
        			MAX(CASE WHEN type = ''R-Site'' THEN max_stock END) AS r_site_max_stock,
        			MAX(CASE WHEN type = ''R-Site'' THEN wos END) AS r_site_wos,
        			MIN(CASE WHEN type = ''R-Site'' THEN min_stock_validator END) AS r_site_min_stock_validator,
        			MAX(CASE WHEN type = ''R-Site'' THEN max_stock_validator END) AS r_site_max_stock_validator,

        			ARRAY_AGG(DISTINCT store_code) AS mapped_stores,
        			COUNT(DISTINCT store_code) AS mapped_stores_count
    		FROM constraint_data_flat
    		GROUP BY ph_code
			)
            ,product_profiles_ia as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', pp_code, ''name'', name, ''label'', special_classification) as iapp
            	FROM %7$s ph
                JOIN inventory_smart.product_profile_master ppm using(ph_code)
        		WHERE special_classification = ''ia-recommended''
            )
            ,article_dc_config as (
            	SELECT ph_code,
            		array_agg(
 			            jsonb_build_object(
 			                ''value'', dc_code, ''label'', name,
 			                ''is_default'', true
 			            )
 			        )
					 as dcs
              	FROM
              		(select ph_code, dc_code, name from product_store_dc_mapping group by 1, 2, 3) psdm
              	GROUP BY 1
            )
            ,article_udpp_config as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', ppm.pp_code, ''name'', ppm.name, ''label'', ppm.special_classification) as udpp
            	FROM %7$s ph
                join %8$s pcm using(ph_code)
                join inventory_smart.product_profile_master ppm
                on pcm.default_product_profile = ppm.pp_code
				join inventory_smart.product_profile_user_mapping_size ppums
                on pcm.default_product_profile = ppums.pp_code and ppums.size = any(ph.sizes)
            )
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
					pcms.default_store_group as default_sg_code
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
			)
			, allocation_rule as (
				select dc_store_policy.ph_code, dspur.rule_code, dspur.values as alloc_rules
				from %8$s dc_store_policy
				join inventory_smart.dc_store_policy_user_rule dspur
				on dc_store_policy.dc_store_rule = dspur.rule_code
			)
            ,final_result as (
            	SELECT %4$s as limit,
                       ph.offset,
                       inv_info.sizes,
                       ph.product_codes as upc,
                	   ph.article,
                       ph.l6_name,
					   ph.l0_name,
					   ph.l2_name,
					   ph.l3_name,
					   ph.l4_name,
					   ph.l5_name,
					   ph.color,
					   ph.product_lifecycle,
					   ph.flex_style,
					   ph.generic,
					   ph.sizes_mat,
					   ph.form,
					   ph.user_defined_1,
					   ph.user_defined_2,
					   ph.user_defined_3,
					   ph.user_defined_4,
					   ph.user_defined_5,
					   ph.current_floorset,
					   ph.current_assortment_group,
					   cd.mapped_stores_count,
                 	   cd.mapped_stores,
                 	   cd.aps,
					   tm.last_week_sales,
                 	   tm.last_4_week_sales,
					   tm.aur,
                 	   CAST(ROUND(cd.store_wos) as INTEGER) as store_wos,
                 	   CAST(ROUND(cd.store_min_stock) as INTEGER) as store_min_stock,
                 	   CAST(ROUND(cd.store_max_stock) as INTEGER) as store_max_stock,
                 	   CAST(ROUND(cd.store_min_stock_validator) as INTEGER) as store_min_stock_validator,
					   CAST(ROUND(cd.store_max_stock_validator) as INTEGER) as store_max_stock_validator,
					   CAST(ROUND(cd.l_site_wos) as INTEGER) as l_site_wos,
                 	   CAST(ROUND(cd.l_site_min_stock) as INTEGER) as l_site_min_stock,
                 	   CAST(ROUND(cd.l_site_max_stock) as INTEGER) as l_site_max_stock,
                 	   CAST(ROUND(cd.l_site_min_stock_validator) as INTEGER) as l_site_min_stock_validator,
					   CAST(ROUND(cd.l_site_max_stock_validator) as INTEGER) as l_site_max_stock_validator,
					   CAST(ROUND(cd.r_site_wos) as INTEGER) as r_site_wos,
                 	   CAST(ROUND(cd.r_site_min_stock) as INTEGER) as r_site_min_stock,
                 	   CAST(ROUND(cd.r_site_max_stock) as INTEGER) as r_site_max_stock,
                 	   CAST(ROUND(cd.r_site_min_stock_validator) as INTEGER) as r_site_min_stock_validator,
					   CAST(ROUND(cd.r_site_max_stock_validator) as INTEGER) as r_site_max_stock_validator,
                 	   COALESCE(reserve_quantity, 0) as reserve_quantity,
                 	   COALESCE(oh, 0) as beginning_available_to_allocate_oh,
					   COALESCE(begining_oh, 0) as begining_oh,
                 	   COALESCE(oo, 0) as beginning_available_to_allocate_oo,
                 	   COALESCE(it, 0) as it,
					   COALESCE(oh_oo, 0) as beginning_available_to_allocate_oh_oo,
                 	   oh_map,
                 	   rq_map,
                 	   COALESCE(allocated_units, 0) as allocated_units,
                 	   ((COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)) as net_available_inventory_oh,
                 	   ((COALESCE(oh_oo, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)) as net_available_inventory_oh_oo,
                 	   ((COALESCE(oo, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)) as net_available_inventory_oo,
                 	   au_map,
                 	   CASE WHEN udpp IS NULL THEN ARRAY[iapp || ''{"is_default": true}'']
                 	        WHEN iapp = udpp THEN ARRAY[iapp || ''{"is_default": true}'']
                 	       	ELSE ARRAY[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}'']
					   END as product_profiles,
                 	   dcs,
					   store_groups,
					   alloc_rule.alloc_rules as allocation_rules,
					   ''DC Inv. on Hand'' as inv_source,
					   allocated_time as "last_allocated"
            	FROM %7$s ph
                JOIN article_sg_config asgc on ph.ph_code = asgc.ph_code
				left join final_inventory inv_info on inv_info.article = ph.article
                JOIN constraint_data cd on ph.ph_code = cd.ph_code
                LEFT JOIN product_profiles_ia ppi on ph.ph_code = ppi.ph_code
                JOIN article_dc_config adc on ph.ph_code = adc.ph_code
                LEFT JOIN article_udpp_config ppu on ph.ph_code = ppu.ph_code
                LEFT JOIN txs_metrics tm on ph.ph_code = tm.ph_code
				left join allocation_rule alloc_rule on ph.ph_code = alloc_rule.ph_code
				WHERE (COALESCE(oh_oo, 0) - COALESCE(reserve_quantity, 0) - COALESCE(allocated_units, 0)) > 0
 		) %3$s';

		execute ('drop table if exists '|| _result_table);
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Droping _result_table table' ,'drop table if exists '|| _result_table,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
		execute format($$CREATE unlogged TABLE IF NOT EXISTS %1$s (
			"limit" INTEGER,
			"offset" INTEGER,
			sizes text[],
			upc text[],
			article TEXT,
			l6_name TEXT,
			l0_name TEXT,
			l2_name TEXT,
			l3_name TEXT,
			l4_name TEXT,
			l5_name TEXT,
			color TEXT,
			product_lifecycle TEXT,
			flex_style TEXT,
			generic TEXT,
			sizes_mat TEXT,
			form TEXT,
			user_defined_1 TEXT,
			user_defined_2 TEXT,
			user_defined_3 TEXT,
			user_defined_4 TEXT,
			user_defined_5 TEXT,
			current_floorset TEXT,
			current_assortment_group TEXT,
			mapped_stores_count INTEGER,
			mapped_stores text[],
			aps INTEGER,
			last_week_sales INTEGER,
			last_4_week_sales INTEGER,
			aur INTEGER,
			store_wos INTEGER,
            store_min_stock INTEGER,
            store_max_stock INTEGER,
            store_min_stock_validator INTEGER,
			store_max_stock_validator INTEGER,
			l_site_wos INTEGER,
            l_site_min_stock INTEGER,
            l_site_max_stock INTEGER,
            l_site_min_stock_validator INTEGER,
			l_site_max_stock_validator INTEGER,
			r_site_wos INTEGER,
            r_site_min_stock INTEGER,
            r_site_max_stock INTEGER,
            r_site_min_stock_validator INTEGER,
		 	r_site_max_stock_validator INTEGER,
			reserve_quantity INTEGER,
			beginning_available_to_allocate_oh INTEGER,
			begining_oh INTEGER,
			beginning_available_to_allocate_oo INTEGER,
			it INTEGER,
			beginning_available_to_allocate_oh_oo INTEGER,
			oh_map JSON,
			rq_map JSON,
			allocated_units INTEGER,
			net_available_inventory_oh INTEGER,
			net_available_inventory_oh_oo INTEGER,
			net_available_inventory_oo INTEGER,
			au_map JSON,
			product_profiles JSON[],
			dcs JSON[],
			store_groups JSON[],
			allocation_rules JSONB,
			inv_source TEXT,
			last_allocated DATE
		);$$
		, _result_table);

		WHILE _count > 0 AND _batch_count = 0 LOOP
			_limit_clause := 'ORDER BY article  LIMIT ' || _limit || ' OFFSET ' || _offset;


			--ph_data table
			_temp_query := format('drop table if exists %1$s cascade;', ph_data_id);
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'First_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop ph_data_id::::  %', end_time - start_time;

			_temp_query := format(
				'create temp table %2$s as (
					with ph_data_without_offset as (
					select
						*
					from
						inventory_smart.ph_master
					join (
						select distinct article from inventory_smart.article_inventory_dashboard aid
						join "global".store_attributes_filter saf using(store_code)
						where store_category != ''DC''
					) aid using (article)
					join (select distinct article from inventory_smart.sku_dc_available_units where oh_oo > 0) sku using (article)
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
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Second_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time ph _Data query ::::  %', end_time - start_time;

			--prod data table
			start_time := clock_timestamp();
			execute format('drop table if exists prod_data_%1$s cascade;', vl_unique_identifier);
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop table if exists prod_data_ ::::  %', end_time - start_time;

			_temp_query := format('create unlogged table prod_data_%1$s with (autovacuum_enabled=false) as (select unnest(product_codes) as product_code from  %2$s);',vl_unique_identifier, ph_data_id);
			raise notice ' prod data query %', _temp_query;
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'third_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop table if exists prod_data_ ::::  %', end_time - start_time;

			--ph_config table
			start_time := clock_timestamp();
			execute format('drop table if exists %1$s cascade', ph_configuration_mapping);
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop ph_configuration_mapping ::::  %', end_time - start_time;

			_temp_query := format (
				'create temp table %1$s as (
					select array_agg(resolved_data.product_code) as product_codes,
							max(resolved_data.default_store_groups) as default_store_groups,
							max(resolved_data.default_product_profile) as default_product_profile,
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
			raise notice 'ph  configuration data query : %', _temp_query;
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Fourth_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time ph  configuration data query ::::  %', end_time - start_time;

			--psm input table
			_rcl_input_query := format(_rcl_input_query_format, ph_data_id);
			raise notice '_rcl_input_query: %', _rcl_input_query;
			start_time := clock_timestamp();
			execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop _rcl_input_table ::::  %', end_time - start_time;

			_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' with (autovacuum_enabled=false) as ( ' || _rcl_input_query || ' );';
			raise notice '_rcl_input_query: %', _rcl_input_query;
			start_time := clock_timestamp();
			execute _rcl_input_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'first_rcl_input_query' ,_rcl_input_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time _rcl_input_query ::::  %', end_time - start_time;

			--psm resolution
			start_time := clock_timestamp();
			execute 'drop table if exists '|| _rcl_psm_resolved_table || ';';
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop _rcl_psm_resolved_table ::::  %', end_time - start_time;

			_temp_query := format('
				create unlogged table %2$s with (autovacuum_enabled=false) as (
					select * from global.generate_rcl_psm_data_v2(''%1$s'', 101, current_date)
				);',
				_rcl_input_table, _rcl_psm_resolved_table
			);
			raise notice 'RCL resolution query : %', _temp_query;
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Fifth_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time RCL resolution query ::::  %', end_time - start_time;


			--SUPPLY ROUTE TABLE
			start_time := clock_timestamp();
			execute 'drop table if exists '|| _supply_route_table || ';';
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop supply route table ::::  %', end_time - start_time;

			_temp_query := format('
				create unlogged table '|| _supply_route_table || ' with (autovacuum_enabled=false) as (
					'|| _supply_route_query ||'
				);'
			);
			raise notice 'Supply Route Query : %', _temp_query;
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Fifth_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time supply route table ::::  %', end_time - start_time;


			--Constraints input table
			start_time := clock_timestamp();
			execute format('drop table if exists %1$s cascade;', _constraints_input_table);
			end_time := clock_timestamp();
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop _constraints_input_table ::::  %', end_time - start_time;

			_temp_query := format('
				create unlogged table %1$s with (autovacuum_enabled=false) as (
 					with store_data as(
						select distinct psm.product_code, psm.store_code, article from %2$s psm
						join
							(select l6_name, unnest(product_codes) as product_code, article from %3$s) paf using (product_code)
						join
							global.product_store_attributes_filter psaf
						on paf.l6_name=psaf.l6_name and psm.store_code=psaf.store_code
						join %4$s srl on psm.product_code = srl.product_code and psm.store_code = srl.location
					),
 					site_data as(
 						select srl.product_code, srl.location as store_code , article
 						from %4$s srl
 						join
 							(select l6_name, unnest(product_codes) as product_code, article from %3$s) paf using (product_code)
 						join
							global.product_store_attributes_filter psaf
						on paf.l6_name=psaf.l6_name and srl.location=psaf.store_code
 						where srl.type in (''L-Site'',''R-Site'')
 					)
 					select * from store_data
 					union
 					select * from site_data
 			);',_constraints_input_table, _rcl_psm_resolved_table, ph_data_id, _supply_route_table);
			raise notice 'temp query for constraints  : %', _temp_query;
			start_time := clock_timestamp();
			execute _temp_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'sixth_temp_query' ,_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;					end_time := clock_timestamp();
			RAISE NOTICE 'Time taken to resolve constraints input query::::  %', end_time - start_time;

			-- constraint resolution table
			start_time := clock_timestamp();
			-- execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
			end_time := clock_timestamp();
			RAISE NOTICE 'Time drop constraints_resolved_data_ ::::  %', end_time - start_time;

			-- _rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
			-- 	select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
			-- )', _constraints_input_table, vl_unique_identifier);

			execute format('drop table if exists constraints_resolved_data_v_%1$s', vl_unique_identifier);
				_rcl_input_query := format('create temp table constraints_resolved_data_v_%2$s as (
					select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
				)', _constraints_input_table, vl_unique_identifier);
				raise notice ' constraints resolution query: % ', _rcl_input_query;

                perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'constraints resolution query' ,_rcl_input_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
				execute _rcl_input_query;
                execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
                execute format('select count(1) from constraints_resolved_data_v_%1$s where min_distribution is not null', vl_unique_identifier) into _count_check;

                if (_count_check > 0) then 
                 _rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
                   select * from inventory_smart.calculate_min_strategy(''%1$s'',''constraints_resolved_data_v_%2$s'')
                     )', ph_configuration_mapping, vl_unique_identifier);
                else 
                 _rcl_input_query := format('create temp table constraints_resolved_data_%1$s as (
                    select * from constraints_resolved_data_v_%1$s
                      )', vl_unique_identifier);
                end if;

			raise notice ' constraints resolution query: % ', _rcl_input_query;
			start_time := clock_timestamp();
			execute _rcl_input_query;
			perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'second_rcl_input_query' ,_rcl_input_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time_rcl_input_query ::::  %', end_time - start_time;
            execute format('select array_agg(distinct article) from constraints_resolved_data_%1$s', vl_unique_identifier) into _resolved_articles;
			_resolved_articles := coalesce(_resolved_articles, '{}');
			raise notice 'resolved articles: %', _resolved_articles;


			--main query
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

			start_time := clock_timestamp();
			--OPEN $1 FOR EXECUTE _query_combine;

			EXECUTE FORMAT('INSERT INTO %1$s SELECT * FROM (%2$s) as final_result',_result_table, _query_combine);
			end_time := clock_timestamp();
			RAISE NOTICE 'Time _query_combine ::::  %', end_time - start_time;

			-- Only way to get the count of items in the cursor`
			start_time := clock_timestamp();
			--MOVE FORWARD ALL FROM $1;
			--GET DIAGNOSTICS _batch_count := ROW_COUNT;
			--MOVE BACKWARD ALL FROM $1;

			execute('select count(*) from ' || _result_table) into _batch_count;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time cursor operation ::::  %', end_time - start_time;

			IF _batch_count = 0 THEN
				_query_combine_count = format(_query_combine_count_format, _limit_clause);
				start_time := clock_timestamp();
				EXECUTE _query_combine_count INTO _count;
				perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', '_query_combine_count' ,_query_combine_count,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
				end_time := clock_timestamp();
				RAISE NOTICE 'Time _query_combine_count ::::  %', end_time - start_time;
			END IF;
			_offset := _offset + _limit;
			_limit := _limit + _limit;
			--IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;

		END LOOP;
		raise notice ' dropping the rcl input tables';
		--execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
		--execute 'drop table if exists ' || _rcl_psm_resolved_table ||' cascade; ';
		open $1 for execute('select * from '|| _result_table);
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Brfore return' ,'select * from '|| _result_table,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;
	    --execute ('drop table '|| _result_table);
 		RETURN $1;
	end
 $function$
;