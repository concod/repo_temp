--liquibase formatted sql
--changeset rajesh.kumar:MTP-122950 runOnChange:true stripComments:false splitStatements:false context:MTP-122950 labels:MTP-122950
--comment: MTP-122950
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer);

CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	declare
 		_query_pa text := '';
		_query_pa_mandatory text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_channel_filter text := inventory_smart.get_channel_str_from_input($3);
 		_store_active_filter text := '{"active": []}'::jsonb || $3;
 		_query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
        _query_sa_psm text := '';
       _query_sa_psm_filters text := '';
       _query_sa_psm_base text := '';
        _ph_query text := '';
 		_product_filters jsonb := $2 ;
		_l0l1_conditions text[];
		_l0l1_key text;
		_l0l1_filters jsonb;
		_l0l1_filter jsonb;
		_l0l1_values_text text;
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
	 _count_check int;

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
		-- Split _query_sa_psm into base (FROM/JOIN) and filters (WHERE ...)
		IF position(' WHERE ' in _query_sa_psm) > 0 THEN
			_query_sa_psm_base := substring(_query_sa_psm from 1 for position(' WHERE ' in _query_sa_psm) - 1);
			_query_sa_psm_filters := substring(_query_sa_psm from position(' WHERE ' in _query_sa_psm));
		ELSE
			_query_sa_psm_base := _query_sa_psm;
			_query_sa_psm_filters := '';
		END IF;
		raise notice ' _query_sa_psm_base %', _query_sa_psm_base;
		raise notice ' _query_sa_psm_filters %', _query_sa_psm_filters;

		-- Remove store_grade and store_cluster from _product_filters if they exist
		_product_filters := _product_filters - 'store_grade' - 'store_cluster';
		raise notice ' _product_filters %', _product_filters;
		-- Build WHERE clause from _product_filters using only l0_name and l1_name
		FOR _l0l1_key IN SELECT unnest(ARRAY['l0_name']) LOOP
			_l0l1_filters := _product_filters -> _l0l1_key;
			IF _l0l1_filters IS NULL OR jsonb_typeof(_l0l1_filters) <> 'array' OR jsonb_array_length(_l0l1_filters) = 0 THEN
				CONTINUE;
			END IF;
			FOR _l0l1_filter IN SELECT * FROM jsonb_array_elements(_l0l1_filters) LOOP
				IF (_l0l1_filter->>'type') = 'list' AND lower(coalesce(_l0l1_filter->>'operator','in')) = 'in' THEN
					_l0l1_values_text := replace(replace((_l0l1_filter->>'values')::text, '[', '{'), ']', '}');
					_l0l1_conditions := array_append(_l0l1_conditions, '(' || _l0l1_key || '::varchar = any(''' || _l0l1_values_text || '''::varchar[]))');
				END IF;
			END LOOP;
		END LOOP;
		IF cardinality(_l0l1_conditions) > 0 THEN
			_query_pa_mandatory := ' WHERE ' || array_to_string(_l0l1_conditions, ' AND ', '');
		ELSE
			_query_pa_mandatory := '';
		END IF;
		raise notice ' _query_pa_mandatory %', _query_pa_mandatory;

 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  _product_filters
 		);

        -- Store WHERE-only version for count query (before adding search/sort)
        _query_pa := _query_pa || _ph_search || _ph_sort;
        _query_pa := replace(_query_pa, '%', '%%');
        _query_pa := _query_pa || ' %1$s';
		raise notice ' _query_pa %', _query_pa;
        raise notice ' _query_sa_psm % ', _query_sa_psm;
         if (_channel_filter = '') IS FALSE then
         	_channel_filter := ' WHERE channel in  '||_channel_filter||' ' ;
        end if;

		_query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';

		raise notice ' _query_pa_mandatory % ', _query_pa_mandatory;
		raise notice ' _query_combine_count_format % ', _query_combine_count_format;

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
			psaf_cte as MATERIALIZED (
				select store_code, store_grade, store_cluster from global.product_store_attributes_filter
				'||_query_pa_mandatory||'
			),
			sgm as MATERIALIZED (
				select asgm.sg_code , psaf.store_code, psaf.psa_code from global.store_groups_mapping asgm
				join (
					select DISTINCT psaf.store_code, psa_code '||_query_sa_psm_base||'
					join psaf_cte on psaf.store_code=psaf_cte.store_code
					'||_query_sa_psm_filters||'
				)psaf on asgm.store_code=psaf.store_code
			)
			select product->>''product_code'' as product_code, sgm.store_code, sgm.psa_code
                    from store_group esg
                    join sgm
                        on sgm.sg_code = esg.default_sg_code
                    group by 1, 2, 3';

 		_query_combine_format := 'with
			ph_products as MATERIALIZED (
  				select
    				ph.ph_code,
    				ph.article,
    				ph.channel,
    				(p->>''product_code'') as product_code,
    				(p->>''size'')         as size
  				from %7$s ph
  				cross join lateral unnest(ph.product_code_size_map) as p
			)

			,product_dc_map as (
                 SELECT ''po'' as po,
                       php.ph_code,
                       php.channel,
                       php.article,
                       php.product_code,
                       php.size,
                       pmpd.dc_code
                FROM ph_products php
                JOIN global.product_mapping_product_dc pmpd on pmpd.product_code = php.product_code
                JOIN global.distribution_centres gdc using(dc_code)
                WHERE pmpd.is_active AND gdc.is_active AND NOT gdc.is_deleted
                )

            ,product_store_dc_mapping as (
                SELECT DISTINCT
                       pmps.product_code,
                       pmps.store_code,
                       php.ph_code,
				   php.article,
                       pdc.dc_code,
				   php.size
               	FROM ph_products php
                JOIN %6$s pmps USING(product_code)
                JOIN product_dc_map pdc
                	ON pdc.ph_code = php.ph_code
                	AND pdc.product_code = php.product_code
                	AND pdc.size = php.size
                JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)
				where pmsd.is_active
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
				max(auto_allocation_dc) as auto_allocation_dc,
				CAST(ROUND(SUM(COALESCE(lw_units, 0))) AS INTEGER) AS lw_units,
				CAST(ROUND(SUM(COALESCE(lw_margin_perc, 0))) AS INTEGER) AS lw_margin,
				CAST(ROUND(SUM(COALESCE(lw_revenue, 0))) AS INTEGER) AS lw_revenue,
				CAST(ROUND(SUM(COALESCE(last_4_week_sales, 0))) AS INTEGER) AS last_4_week_sales,
                round(coalesce((sum(lw_revenue) / nullif( sum(lw_units), 0 )),0)::decimal,2) AS price,
				ROUND(CAST(COALESCE(AVG(discount), 0) AS NUMERIC), 2) AS discount,
                ROUND(CAST(CASE WHEN COUNT(*) != 0 THEN COUNT(CASE WHEN instock_percentage = 1 THEN 1 ELSE NULL END) / CAST(COUNT(*) AS FLOAT) ELSE 0 END AS NUMERIC), 2) AS in_stock_perc
			FROM aid
			group by 1
			)
			,before_allocated_pre as (
				select ph.product_code, ph.ph_code, ph.size,
					JSONB_OBJECT_AGG(ph.dc_code, eaches_oh) as eaches_oh_map,
					JSONB_OBJECT_AGG(ph.dc_code, packs_oh) as packs_oh_map,
					sum(eaches_oh) as eaches_oh,
					sum(packs_oh) as packs_oh
				from (select ph_code, article, product_code, dc_code, size from product_store_dc_mapping group by 1, 2, 3, 4, 5) ph
				join (
					select
						dpi.dc_code,
						dpi.article,
						dpc.product_code,
						dpc.size,
						SUM( case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end ) eaches_oh,
						SUM( case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end ) packs_oh
					from inventory_smart.dc_pack_inventory dpi
     				JOIN inventory_smart.dc_pack_configuration dpc
     				on
     					dpi.pack_type_id=dpc.pack_type_id
     					and dpi.article=dpc.article
     					and dpi.pack_type=dpc.pack_type
					WHERE EXISTS (SELECT 1 FROM %7$s ph WHERE ph.article = dpi.article)
					group by 1, 2, 3, 4
     			) dpi on
				dpi.article = ph.article and dpi.product_code = ph.product_code and dpi.dc_code = ph.dc_code
				group by 1, 2, 3
			)
			,before_allocated as (
				select ph_code,
					JSONB_OBJECT_AGG(size, eaches_oh_map) as eaches_oh_map,
					JSONB_OBJECT_AGG(size, packs_oh_map) as packs_oh_map,
					sum(eaches_oh) as eaches_oh,
					sum(packs_oh) as packs_oh
				from before_allocated_pre
				group by 1
			)
			,last_allocated_date_cte as MATERIALIZED(
				select article,
					max(last_allocation_date) as allocated_time
                from inventory_smart.last_allocation_date_table ladt
                    group by 1
			)
			,sk_dc_allocated_initial as MATERIALIZED(
				select article, dc_code, size,
					max(updated_at) as allocated_time,
					coalesce(sum(quantity), 0) as quantity
                from inventory_smart.sku_dc_allocated_units('''', ''%10$s'')
                    group by 1,2, 3
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
					coalesce(sdai.quantity, 0) as allocated_units,
					(oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdai.quantity, 0)) as net_available_inventory,
					(oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdai.quantity, 0)) as net_available_inventory_oh,
					COALESCE(sdai.allocated_time, ladc.allocated_time, null) as allocated_time
					from product_dc_map_after_store_eligible ph
				join
					(
						select product_code, dc_code, size, article,
                            sum(coalesce(oh, 0)) as oh,
							sum(coalesce(oo, 0)) as oo,
							sum(coalesce(it, 0)) as it
                            from
                            inventory_smart.sku_dc_available_units(''%10$s'')
                            group by 1, 2, 3, 4
					) sda
				using (product_code, dc_code, article, size)
				left join
					inventory_smart.sku_dc_reserved_units sku_reserv
				using (product_code, dc_code, size, article)
				left join sk_dc_allocated_initial sdai
				on sdai.article = sda.article and sdai.dc_code = sda.dc_code and sdai.size = sda.size
				LEFT JOIN last_allocated_date_cte ladc
				on sda.article = ladc.article
			)
			,agg_inventory_details_pre as (
				select product_code, ph_code, size, dc_code,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(total_reserve) as total_reserve,
					sum(net_available_inventory) as net_available_inventory,
                    sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
					from inventory_details_product_dc_level
				group by 1, 2, 3, 4
			)
			,agg_inventory_details as (
				select product_code, ph_code, size,
					JSONB_OBJECT_AGG(dc_code, oh) as oh_map,
					JSONB_OBJECT_AGG(dc_code, allocated_units) as au_map,
					JSONB_OBJECT_AGG(dc_code, total_reserve) as rq_map,
					JSONB_OBJECT_AGG(dc_code, net_available_inventory_oh) as ctat_oh_map,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(total_reserve) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
					sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
					from agg_inventory_details_pre
				group by 1, 2, 3
			)
			,final_inventory as (
				select ph_code,
					JSONB_OBJECT_AGG(size, oh_map) as oh_map,
					JSONB_OBJECT_AGG(size, au_map) as au_map,
					JSONB_OBJECT_AGG(size, rq_map) as rq_map,
					JSONB_OBJECT_AGG(size, ctat_oh_map) as ctat_oh_map,
					array_agg(size) as sizes,
					array_agg(product_code) as product_codes,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(reserve_quantity) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
					sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
				from agg_inventory_details
				group by 1
			)
			,vir_iob_initial_cte as (
				select
					DISTINCT
                    ph.ph_code,
                    ph.article,
                    ic.display_article,
                    ph.dc_code,
                    COALESCE(ic.vir_reservation_remaining, 0) AS vir_reservation_remaining,
                    COALESCE(ic.iob_reservation_remaining, 0) AS iob_remaining
                FROM
					product_dc_map_after_store_eligible ph
                LEFT JOIN inventory_smart.article_inventory_constraint ic
                ON ph.article = ic.article AND ph.dc_code = ic.dc_code
			)
			,dc_level_allocation as (
				select
					article, dc_code,
					coalesce(sum(quantity), 0) as allocated_quantity
                from
                	sk_dc_allocated_initial
                group by 1,2
			)
			,adjusted_vir_iob AS (
				SELECT
					viic.ph_code,
					viic.article,
					viic.display_article,
					viic.dc_code,
					COALESCE(dla.allocated_quantity, 0) AS allocated_quantity,
					GREATEST(viic.vir_reservation_remaining - COALESCE(dla.allocated_quantity, 0), 0) AS vir_after_alloc,
					GREATEST(
						viic.iob_remaining - GREATEST(COALESCE(dla.allocated_quantity, 0) - viic.vir_reservation_remaining, 0),
						0
					) AS iob_after_alloc
				FROM vir_iob_initial_cte viic
				LEFT JOIN dc_level_allocation dla
				ON viic.article = dla.article
				AND viic.dc_code = dla.dc_code
			)
			,vir_iob_final_agg AS (
				SELECT
					ph_code,
					article,
					display_article,
					sum(vir_after_alloc) as vir_pdu_remaining,
					sum(iob_after_alloc) as iob,
					JSONB_OBJECT_AGG(dc_code, vir_after_alloc ORDER BY dc_code) AS vir_by_dc_map,
					JSONB_OBJECT_AGG(dc_code, iob_after_alloc ORDER BY dc_code) AS iob_by_dc_map
				FROM adjusted_vir_iob
				GROUP BY ph_code, article, display_article
			)
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
            ,product_profiles_ia as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', pp_code, ''name'', name, ''label'', special_classification) as iapp
            	FROM %7$s ph
                JOIN inventory_smart.product_profile_master ppm using(ph_code)
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
            ,first_dc_code as (
                SELECT DISTINCT ON (ph_code)
                    ph_code,
                    (unnest(dcs)->>''value'')::integer as first_dc_code
                FROM article_dc_config
            )
            ,article_constraints as (
                SELECT
                    aic.article,
                    aic.dc_code,
					array_agg(distinct
 			            jsonb_build_object(
 			                ''value'', aic.vir_constraint_flag, ''label'', aic.vir_constraint_flag,
 			                ''is_default'', true
 			            )) as vir_constraint
                FROM inventory_smart.article_inventory_constraint aic
                JOIN first_dc_code fdc ON aic.dc_code = fdc.first_dc_code
                JOIN %7$s ph ON aic.article = ph.article
				group by 1,2
            )
            ,article_udpp_config as (
            	SELECT ph.ph_code,
                	   JSONB_BUILD_OBJECT(''value'', ppm.pp_code, ''name'', ppm.name, ''label'', ppm.special_classification) as udpp
            	FROM %7$s ph
                --JOIN inventory_smart.ph_configuration_mapping pcm using(ph_code)
                join %8$s pcm using(ph_code)
                -- optimization - right  now ph_conf is small so doing the same join 3 times is ok
                -- when this data swells up, can join once and use thrice
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
                 	   ph.l0_name,
                 	   ph.l1_name,
                 	   ph.l2_name,
                 	   ph.l3_name,
                	   ph.l4_name,
					   ph.l5_name,
					   ph.l7_code,
					   ph.display_article,
					   ph.article_description,
					   ph.mfp_categorization,
					   ph.l6_name,
					   ph.on_floor_date,
					   ph.markdown_date,
                 	   ph.article,
                 	   ph.ph_code,
                 	   --ph.sizes,
					   inv_info.sizes,
					   inv_info.product_codes upc,
					   ph.lifecycle as product_life_cycle,
                 	   STRING_TO_ARRAY(ph.channel, '','')  as channel,
                 	--    COALESCE(reserve_quantity, 0) as reserve_quantity,
                 	--    COALESCE(oh, 0) as oh,
                 	--    COALESCE(oo, 0) as oo,
                 	--    COALESCE(it, 0) as it,
                 	   null as pack_type_id,
                 	   oh_map,
                 	   rq_map,
					   ctat_oh_map,
                 	   allocated_units,
                 	   net_available_inventory as oh,
					   net_available_inventory,
					   net_available_inventory_oh,
                 	   au_map,
                 	   CASE WHEN udpp IS NULL THEN ARRAY[iapp || ''{"is_default": true}'']
                 	        WHEN iapp = udpp THEN ARRAY[iapp || ''{"is_default": true}'']
                 	       	ELSE ARRAY[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}'']
					   END as product_profiles,
                 	   dcs,
					   store_groups,
                 	   cd.mapped_stores_count,
                 	   cd.mapped_stores,
                 	   cd.aps,
                 	   CAST(ROUND(cd.wos) as INTEGER) as wos,
                 	   CAST(ROUND(cd.min_stock) as INTEGER) as min_stock,
                 	   CAST(ROUND(cd.max_stock) as INTEGER) as max_stock,
                 	   CAST(ROUND(cd.min_stock_validator) as INTEGER) as min_stock_validator,
					   CAST(ROUND(cd.max_stock_validator) as INTEGER) as max_stock_validator,
                 	   tm.lw_units,
                 	   tm.lw_margin,
                 	   tm.lw_revenue,
					   tm.last_4_week_sales,
					   tm.price,
                 	   tm.discount,
					   tm.auto_allocation_dc,
					   COALESCE(to_char(inv_info.allocated_time, ''MM-DD-YYYY''), '''') as "last_allocated",
					   b_alloc.eaches_oh as beginning_available_to_allocate_eaches_oh,
					   b_alloc.packs_oh as beginning_available_to_allocate_packs_oh,
					   b_alloc.eaches_oh_map as beginning_available_to_allocate_eaches_oh_map,
                	   b_alloc.packs_oh_map as beginning_available_to_allocate_packs_oh_map,
					   alloc_rule.alloc_rules as allocation_rules,
					   vifa.vir_pdu_remaining,
                       vifa.vir_by_dc_map,
                       vifa.iob,
                       vifa.iob_by_dc_map,
					   ac.vir_constraint
            	FROM %7$s ph
                JOIN article_sg_config asgc on ph.ph_code = asgc.ph_code
				left join final_inventory inv_info on inv_info.ph_code = ph.ph_code
				left join vir_iob_final_agg vifa on vifa.ph_code = ph.ph_code
                JOIN constraint_data cd on ph.ph_code = cd.ph_code
                LEFT JOIN product_profiles_ia ppi on ph.ph_code = ppi.ph_code
                JOIN article_dc_config adc on ph.ph_code = adc.ph_code
                LEFT JOIN article_udpp_config ppu on ph.ph_code = ppu.ph_code
                LEFT JOIN txs_metrics tm on ph.ph_code = tm.ph_code
				left join before_allocated b_alloc on b_alloc.ph_code = ph.ph_code
				left join allocation_rule alloc_rule on ph.ph_code = alloc_rule.ph_code
                LEFT JOIN article_constraints ac on ph.article = ac.article
              	WHERE net_available_inventory > 0
 			) %3$s';
 			WHILE _count > 0 AND _batch_count = 0 LOOP
 				_limit_clause := 'ORDER BY article  LIMIT ' || _limit || ' OFFSET ' || _offset;
                _temp_query := format('drop table if exists %1$s cascade;', ph_data_id);
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing first temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
                execute _temp_query;
				_temp_query := format(
					'create temp table %2$s as (
									with ph_data_without_offset as (
									select *
									from
										inventory_smart.ph_master
										join (select distinct article from inventory_smart.article_inventory_dashboard ) aid using (article)
										join (select distinct article from inventory_smart.sku_dc_available_units where oh > 0) sku using (article)
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
				_rcl_input_query :=
                             'CREATE UNLOGGED TABLE ' || _rcl_input_table || ' AS (' || _rcl_input_query || '); ' ||
                             'CREATE INDEX idx_' || vl_unique_identifier || '_pm ON ' || _rcl_input_table || ' (product_code);';
				
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
				_temp_query := format('create unlogged table %1$s as (select distinct psm.product_code, article, psm.store_code from %2$s psm
					join
						global.product_attributes_filter paf using (product_code)
					join
						global.product_store_attributes_filter psaf
						on paf.l0_name=psaf.l0_name and psm.store_code=psaf.store_code
					);',
					_constraints_input_table, _rcl_psm_resolved_table);
				raise notice 'temp query for constraints  : %', _temp_query;
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before executing sixth temp_query',_temp_query,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		

				execute _temp_query;
				
				perform  global.sp_log(null, 'inventory_smart.article_selection_list', 'Before dropping table constraints_resolved_data_'||vl_unique_identifier ,'drop table if exists constraints_resolved_data_'||vl_unique_identifier||' cascade;',jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;

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

				-- execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
				-- _rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
				-- 	select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
				-- )', _constraints_input_table, vl_unique_identifier);
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
