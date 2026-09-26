--liquibase formatted sql
--changeset nibeel:MTP-116011 runOnChange:true stripComments:false splitStatements:false context:MTP-116011 labels:MTP-116011
--comment: Adding default args to support new flow, code refactoring
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, text, default_sg_code integer DEFAULT null, alloc_type text DEFAULT 'default', client_config jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 /*
   Create allocation - table 1 SP
  Calling statement:
 begin;
 select * from inventory_smart.article_selection_list('my_cur'::refcursor,
 '{"l0_name": [{"type": "list", "operator": "in", "values": ["101_BRIDAL"]}]}',
 '{"channel": [{"type":"list", "operator":"not in", "values": ["ZALES"]}]}',
 '{}',
 '{}',
 '{"search": [], "sort": [], "range": [], "limit": {"limit": 100, "page": 1}}',
'123');
 FETCH ALL IN "my_cur";
 commit;
   Updated_by       			Updated_on      Purpose
    ----------       			-----------     --------
    Renugopal                	15-Jun-2023     Add user reserve, optimize, intersect constraint and SEG
  */
 	declare
 		_query_pa text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_channel_filter text := inventory_smart.get_channel_str_from_input($3);
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

		vl_unique_identifier text := $7;
		_temp_query text := '';
		_rcl_input_query_format text:= '';
		_rcl_input_query text := '';
		_rcl_input_table text := '';
		_rcl_psm_resolved_table text := '';
		_constraints_input_table text := '';
		_result_table text := '';
		start_time timestamp;
        end_time timestamp;
        pdq_flag boolean := coalesce(_product_filters#>>'{pdq_flag,0,values,0}', 'false')::boolean;
		_resolved_articles varchar[];
		ph_data_id text := '';
		v_gen_random_uuid text := gen_random_uuid()::varchar;

 	begin
		_rcl_input_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		_rcl_psm_resolved_table := 'public.rcl_psm_resolved_data_' || vl_unique_identifier;
		_constraints_input_table := 'public.rcl_constraint_input_data_' || vl_unique_identifier;
		_result_table := 'result_table_' || vl_unique_identifier;
		ph_data_id := 'ph_data_' || vl_unique_identifier;
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
		raise notice '_ph_sort : %', _ph_sort;
		raise notice ' _ph_search : %', _ph_search;
		raise notice ' _overall_search: %', _overall_search;
		raise notice '_limit : %', _limit;
		raise notice ' _offset: %', _offset;
        select * from inventory_smart.form_product_store_filters('dummy', $2, $3) into _query_sa_psm, _ph_query;

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
        _query_pa := _query_pa || '%1$s';
 		raise notice ' _query_pa %', _query_pa;
        raise notice ' _query_sa_psm % ', _query_sa_psm;
         if (_channel_filter = '') IS FALSE then
         	_channel_filter := ' WHERE channel in  '||_channel_filter||' ' ;
         end if;

        --_ph_data_query := replace(_ph_data_query, '%', '%%');
        _query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';

		_rcl_input_query_format := '
			with ph_data as (select * from inventory_smart.ph_master
 					' || _query_pa || ' ),
			store_group as (
				select pcm.* , sg.name
                    from (
                        select
							article,
                            ph.ph_code,
                            unnest(product_code_size_map) as product,
                            pcms.channel,
                            unnest(default_store_groups) as default_sg_code
                        from
                            ph_data ph
                            join inventory_smart.ph_configuration_mapping pcms
							using(ph_code)
                    ) pcm
                    join global.store_groups sg on pcm.default_sg_code = sg.sg_code
                    where is_deleted = false
			),
			sgm as MATERIALIZED (
				select asgm.sg_code , psaf.store_code, psaf.psa_code
				from global.aggregated_store_groups_mapping asgm
				join (
					select store_code, psa_code '||_query_sa_psm||'
				) psaf on psaf.psa_code = asgm.psa_code
			)
			select article,product->>''product_code'' as product_code, sgm.store_code, sgm.psa_code
                    from store_group esg
                    join sgm
                        on sgm.sg_code = esg.default_sg_code
                    group by 1, 2, 3, 4';

		/*_rcl_input_query_format := 'create unlogged table ' || _rcl_input_table || ' as select unnest(product_code_size_map)->>''product_code'' as product_code, store_code
 			  from
 			    (
					select * from inventory_smart.ph_master
 					' || _query_pa || '
				) ph
				join
				(
					select * ' || _query_sa_psm ||'
				) psaf
				on ph.l0_name = psaf.l0_name and ph.l1_name = psaf.l1_name and ph.l3_name = psaf.l3_name and ph.l4_name = psaf.l4_name';
		*/
 		_query_combine_format := '
 			with ph_data as (
 				SELECT * FROM %9$s
 			)
 			--select * from ph_data
 			, product_dc_map as (
                select
                    ph.ph_code,
                    channel,
                    ph.product->>''product_code'' as product_code,
                    ph.product->>''size'' as size,
                    pmpd.dc_code,
                    --mapping_code,
					ph.l0_name,
                    ph.l1_name,
                    ph.l2_name,
                    ph.l3_name,
                    ph.l4_name,
                    ph.article
                from (
                    select
                        ph_code,
                        channel,
                        unnest(product_code_size_map) as product,
						l0_name,
                        l1_name,
                        l2_name,
                        l3_name,
                        l4_name,
                        article
                    from
                        ph_data) ph
                join global.product_dc_mapping pmpd on
                    ph.product->>''product_code'' = pmpd.product_code
 			)
 			--select * from sku_dc_allocated_units
 			, product_store_dc_mapping as MATERIALIZED (
 			  select
 			    --pmps.mapping_code,
 				pmps.product_code,
 			    pmps.store_code,
 			    pdc.ph_code,
				--ph.l0_name,
 				--saf.channel,
 				pmsd.dc_code,
				pdc.size
 			  from
 			    ph_data ph
                join %6$s pmps
				on pmps.product_code = any(ph.product_codes)
 				    --join (' || replace(_query_sa, '%', '%%') || ') saf
 				    --using(store_code)
  				join product_dc_map pdc using(ph_code)
				JOIN global.product_mapping_product_dc pmdc ON pmdc.product_code = pmps.product_code 
  				--JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)
				JOIN global.product_mapping_store_dc pmsd ON pmsd.store_code=pmps.store_code and pmsd.dc_code=pdc.dc_code and pmsd.vendor=pmdc.vendor
				where pmsd.is_active
				group by 1,2,3,4,5
 			)
 			--select * from product_store_dc_mapping
			--select * from product_dc_map
			, product_dc_map_after_store_eligible as (
				select ph_code, product_code, size, dc_code
				from product_store_dc_mapping
				group by 1,2,3,4
			)
			, sku_temp_reserve as (
                    select
                        pdm.ph_code,
						pdm.product_code,
                        pdm.size,
                        au.dc_code,
                        sum(case when type=''p'' then quantity  else 0 end) as pop_shelf_reserve,
                        sum(case when type=''n'' then quantity  else 0 end) as new_store_reserve,
                        sum(quantity) as total_reserve
                    from
                        product_dc_map_after_store_eligible pdm
                    join
                        inventory_smart.sku_dc_reserved_units au
                    using(product_code, dc_code)
                    group by
                        1,
                        2,
                        3,
						4
            )
			,inventory_details_product_dc_level as (
				select
					ph.product_code,
					ph.ph_code,
					ph.dc_code,
					ph.size,
					coalesce(sda.oh, 0) as oh,
					--JSONB_OBJECT_AGG(dc_code, oh) as oh_map
					--JSONB_OBJECT_AGG(ph.dc_code, quantity) as au_map,
					coalesce(sku_reserv.pop_shelf_reserve, 0) as pop_shelf_reserve,
					coalesce(sku_reserv.new_store_reserve, 0) as new_store_reserve,
					coalesce(sku_reserv.total_reserve, 0 ) as total_reserve,
					coalesce(sdal.quantity, 0) as allocated_units,
					(coalesce(oh, 0) -coalesce(sku_reserv.total_reserve, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
					allocated_time
					from product_dc_map_after_store_eligible ph
				    join
					(
						select 
							' || (case when pdq_flag then 'pack_type_id as product_code,dc_code,size,avg(coalesce(oh_packs, 0)) as oh' else 'pack_type_id as product_code,dc_code,size,sum(coalesce(oh, 0)) as oh' end) || '
						from
						inventory_smart.sku_dc_available_units
						group by 1, 2, 3
					) sda
				using (product_code, dc_code, size)
				left join
					sku_temp_reserve sku_reserv
				using (product_code, dc_code, size)
				left join
 					(
						select article, dc_code, size,
						 max(updated_at) as allocated_time,
						coalesce(sum(quantity), 0) as quantity
                        from inventory_smart.sku_dc_allocated_units('''', ''%8$s'')
                        group by 1,2, 3
					) sdal
				on sdal.article = sda.product_code and sdal.dc_code = sda.dc_code and sdal.size = sda.size
				--group by ph.product_code, ph.dc_code
				where (oh -coalesce(sku_reserv.total_reserve, 0 ) - coalesce(sdal.quantity, 0)) > 0
		)
						,agg_inventory_details as (
				select
					idpdl.product_code,
					idpdl.ph_code,
					idpdl.size,
					JSONB_OBJECT_AGG(idpdl.dc_code, idpdl.oh) as oh_map,
					JSONB_OBJECT_AGG(idpdl.dc_code,
							jsonb_build_object(
								''oh'', idpdl.oh,
								''is_virtual'', dc.is_virtual,
								''linked_store_code'', dc.linked_store_code
							)
						) AS oh_display_map,
					JSONB_OBJECT_AGG(idpdl.dc_code, idpdl.allocated_units) as au_map,
					JSONB_OBJECT_AGG(idpdl.dc_code, idpdl.total_reserve) as rq_map,
					JSONB_OBJECT_AGG(idpdl.dc_code, idpdl.net_available_inventory) as ctat,
					sum(idpdl.oh) as oh,
					sum(idpdl.pop_shelf_reserve) as pop_shelf_reserve,
					sum(idpdl.new_store_reserve) as new_store_reserve,
					sum(idpdl.pop_shelf_reserve) + sum(idpdl.new_store_reserve) as reserve_quantity,
					sum(idpdl.net_available_inventory) as net_available_inventory,
					sum(idpdl.allocated_units) as allocated_units,
					max(idpdl.allocated_time) as allocated_time
				from inventory_details_product_dc_level idpdl
				join global.distribution_centres dc on idpdl.dc_code = dc.dc_code
				group by 1, 2, 3

			)
			,final_inventory as (
				select product_code, ph_code,
					JSONB_OBJECT_AGG(size, oh_map) as oh_map,
					JSONB_OBJECT_AGG(size, oh_display_map) as oh_display_map,
					JSONB_OBJECT_AGG(size, au_map) as au_map,
					JSONB_OBJECT_AGG(size, rq_map) as rq_map,
					JSONB_OBJECT_AGG(size, ctat) as ctat_oh_map,
					sum(oh) as oh,
					sum(pop_shelf_reserve) as pop_shelf_reserve,
					sum(new_store_reserve) as new_store_reserve,
					sum(pop_shelf_reserve)+sum(new_store_reserve) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
				from agg_inventory_details
				group by 1,2
			)

  			,product_store_mapping as (
  				select
  					--mapping_code,
  					product_code,
  					store_code,
  					ph_code
					--,l0_name
  					--channel
					,dc_code
  				from product_store_dc_mapping
  				group by 1,2,3,4

  			)
  			--select * from product_store_mapping;
             ,
             ph_config as (
                     select * from inventory_smart.ph_configuration_mapping  ' || replace(_channel_filter, '%', '%%') || '
             )
			,elligible_store_groups as (
	 			select pcm.* , sg.name
	 			from (select
	 			        ph.ph_code,
						pcm.channel,
	 			        unnest(default_store_groups) as default_sg_code
	 			      from
	 			        ph_data ph
	 			        join ph_config pcm using(ph_code)
	 			  ) pcm
				join global.store_groups sg on pcm.default_sg_code = sg.sg_code
 				where is_deleted = false
			)
			--select * from elligible_store_groups;
			,elligible_stores_mapping as (
				select ph_code, channel, store_code
				from elligible_store_groups esg
				join  (
					select asgm.sg_code , psaf.store_code from
					global.aggregated_store_groups_mapping asgm
                    join
					global.product_store_attributes_filter psaf
					on asgm.psa_code=psaf.psa_code
					) sgm
            	on sgm.sg_code = esg.default_sg_code
				group by 1, 2, 3
			)
			--select * from elligible_stores_mapping;
            --,constraints_resolved_data
			,
			inventory_details_dc_store_mapping as (
				select idpdc.ph_code, idpdc.product_code, store_code
				from inventory_details_product_dc_level idpdc
				left join product_store_mapping using (ph_code, product_code, dc_code)
			)
			--select * from inventory_details_dc_store_mapping
			, 
			mapping_constraint_elligible_join as MATERIALIZED (
				-- for case when ph_config row exists for this ph_code, channel
			 	select
 			        ph_code,
 					esm.channel,
 			        cm.store_code,
 			        aps as aps,
 			        wos as wos
 			      from
 			        inventory_details_dc_store_mapping psm
 			        join elligible_stores_mapping esm using(ph_code, store_code)--, channel)
 			        --left join inventory_smart.constraint_master cm using(mapping_code) --CHANGE 2
 						-- reason - we do not want null store_codes when we do left join
 						-- we do not need articles with absolutely no store mapping at all
 					join constraints_resolved_data_%7$s cm using(product_code, store_code)
 					   -- join inventory_smart.constraint_master cm using(product_code, store_code)
                --union

				-- for case where ph_config does not have row or sg is empty list - we take all valid mappings
                --select
                --ph_code,
                --esm.channel, --psm.channel
                --cm.store_code,
                --aps as aps,
                --wos as wos
              --from
                --product_store_mapping psm
                --left join elligible_stores_mapping esm using(ph_code, store_code) -- ,channel)
                -- --left join inventory_smart.constraint_master cm using(mapping_code) --CHANGE 2
                                -- reason - we do not want null store_codes when we do left join
                                -- we do not need articles with absolutely no store mapping at all
                --join constraints_resolved_data cm using(product_code, store_code)
                --where esm.ph_code is null

			)
 			, constraint_data as (
 			  select
 			    ph_code,
 				array_agg(distinct channel) channel,
 			    ROUND(
 			      AVG(aps):: numeric,
 			      2
 			    ) as aps,
 			    ROUND(
 			      AVG(wos):: numeric,
 			      0
 			    ) as wos,
 			    array_agg(store_code) as mapped_stores,
 			    array_length(
 			      array_agg(store_code),
 			      1
 			    ) as mapped_stores_count
 			  from
 			    mapping_constraint_elligible_join foo
 			  group by
 			    1
 			)
 			--select * from constraint_data
 			, selected_dc_data as (
 			  SELECT
 			    ph_code,
 			    dc.dc_code,
 			    dc.name
 			  FROM
 			    inventory_details_product_dc_level psm
 			    join global.distribution_centres dc using(dc_code)
 			  GROUP BY
 			    1,
 			    2,
 			    3
 			)
 			--select * from selected_dc_data
 			, product_profiles_ia as (
 			  select
 			    ph.ph_code,
 				array_agg(
 				    jsonb_build_object(
 				      ''value'', pp_code, ''name'', name, ''label'',
 				      special_classification, ''is_default'', true
 				    )
 				)as iapp
 			  from
 			    ph_data ph
 			    join inventory_smart.product_profile_master ppm using(ph_code)
 			  where
 			    special_classification = ''ia-recommended''
 			  group by 1
 			)
 			--select * from product_profiles_ia
 			, article_dc_config as (
 			  select
 			    sdc.ph_code,
 			    array_agg( distinct
 			      jsonb_build_object(
 			        ''value'', dc_code, ''label'', name,
 			        ''is_default'',
 			        (
 			          case when default_dc_code is null then false else true end
 			        )
 			      )
 			    ) as dcs
 			  from
 			    (
 			      select
 			        ph.ph_code,
 			        unnest(default_dcs) as default_dc_code
 			      from
 			        ph_data ph
 			        join ph_config pcm using(ph_code)
 			    ) pcm
 			    right join selected_dc_data sdc on pcm.ph_code = sdc.ph_code
 			    and pcm.default_dc_code = sdc.dc_code
 			  group by
 			    1
 			)
 			--select * from article_dc_config
 			, article_udpp_config as (
 			  select
 			    ph.ph_code,
 				array_agg(distinct
 				    jsonb_build_object(
 				      ''value'', pp_code, ''name'', name, ''label'',
 				      special_classification, ''is_default'', false
 				    )
 				)as udpp
 			  from
 			    ph_data ph
 			    join ph_config pcm using(ph_code)
 			    join inventory_smart.product_profile_master ppm on pcm.default_product_profile = ppm.pp_code
 				where is_deleted = false
 				group by 1
 			)
 			-- select * from article_udpp_config
 			, article_sg_config as (
 			  select
 			    esg.ph_code,
 			    array_agg(distinct
 			      jsonb_build_object(
 			        ''value'', default_sg_code, ''label'', name, ''is_default'',
 			        true
 			      )
 			    ) as store_groups
 			  from
				elligible_store_groups esg
 			  group by
 			    1
 			)
 			--select * from article_sg_config
 			, final_result as (
				select
 	                ph.offset,
                    %4$s as limit,
                    ph.l0_name,
                    ph.l1_name,
					ph.l3_name,
					ph.l4_name,
                    ph.ph_code,
                    ph.article,
                    ph.article_status_tag,
                    ph.product_description,
					ph.primary_sku,
                    ph.sizes,
                    ph.product_codes as upc,
					ph.set_date,
					ph.inner_pack_size,
                    cd.channel,
                    coalesce(reserve_quantity, 0) as reserve_quantity,
                    coalesce(pop_shelf_reserve, 0) as pop_shelf_reserve,
                    coalesce(new_store_reserve, 0) as new_store_reserve,
                    coalesce(oh, 0) as oh,
                    coalesce(oh, 0)  as total_inventory,
                    oh_map,
					oh_display_map,
                    coalesce(allocated_units, 0) as allocated_units,
					ctat_oh_map,
                    ((coalesce(oh,0) - coalesce(reserve_quantity,0)) - coalesce(allocated_units,0)) as net_available_inventory,
					((coalesce(oh,0) - coalesce(reserve_quantity,0)) - coalesce(allocated_units,0)) as net_available_inventory_oh,
                    au_map,
					rq_map,
                    case
                        when udpp is null and iapp is null then ''{}''
                        when iapp = udpp then iapp
                        when udpp is not null then array[udpp[1] || ''{"is_default": true}'', iapp[1] || ''{"is_default": false}'']
                        else iapp end as product_profiles,
                    allocated_time,
                    -- iapp as ia_product_profiles,
                    -- udpp as ud_product_profiles,
                    dcs,
                    --case
                    --    when store_groups is null then store_groups || jsonb_build_object(
                    --    ''value'', -1, ''label'', ''Default - Mapping'',
                    --    ''is_default'', true
                    --    )
                    --    else store_groups || jsonb_build_object(
                    --    ''value'', -1, ''label'', ''Default - Mapping'',
                    --    ''is_default'', false
                    --    )
                    --end as store_groups,
                -- store_groups || jsonb_build_object(
                --   ''value'', -1, ''label'', ''Default - Mapping'',
                --   ''is_default'', true
                -- ) as store_groups,
					store_groups,
                    cd.mapped_stores_count,
                    cd.mapped_stores,
                    cd.aps,
                    cd.wos
 			  from
 			    ph_data ph
 				' || (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then 'left' else '' end) || '
 				join article_sg_config asgc on ph.ph_code = asgc.ph_code
 			    --left join sku_dc_reserved_units ru on ph.ph_code = ru.ph_code
 			    --left join sku_dc_available_units avu on ph.ph_code = avu.ph_code
 			    --left join sku_dc_allocated_units alu on ph.ph_code = alu.ph_code
 			    --left
				left join final_inventory inv_info on inv_info.ph_code = ph.ph_code
				join constraint_data cd on ph.ph_code = cd.ph_code
 			    --left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code
 				left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code   --TODO has to be reverted once we have IA product profiles for all articles
 			    join article_dc_config adc on ph.ph_code = adc.ph_code -- inner join to filter out articles that doesnt have article - store mapping
 			    left join article_udpp_config ppu on ph.ph_code = ppu.ph_code
			  ' || (case when not pdq_flag then 'WHERE (COALESCE(oh, 0) - COALESCE(reserve_quantity, 0) - COALESCE(allocated_units, 0)) > 0' else '' end) || '
 			  --WHERE (COALESCE(oh, 0) - COALESCE(reserve_quantity, 0) - COALESCE(allocated_units, 0)) > 0
 			)%3$s';
 		raise notice 'qcc: %', _query_combine_format;

		-- Drop result table if exists from a previous run
		execute ('drop table if exists '|| _result_table);

 			WHILE _count > 0 AND _batch_count = 0 LOOP
 				_limit_clause := ' LIMIT ' || _limit || ' OFFSET ' || _offset;

				-- Create ph_data temp table to avoid re-scanning ph_master across every CTE
				start_time := clock_timestamp();
				execute 'drop table if exists ' || ph_data_id || ' cascade;';
				_temp_query := 'create temp table ' || ph_data_id || ' as (
					with ph_data_without_offset as (
						select * from inventory_smart.ph_master
						' || replace(replace(_query_pa, '%%', '%'), '%1$s', _limit_clause) || '
					)
					SELECT *, ' || _offset || ' + ROW_NUMBER () OVER (' || _ph_sort || ') as offset
					FROM ph_data_without_offset
				)';
				raise notice 'ph_data query: %', _temp_query;
				execute _temp_query;
				perform global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'ph_data_temp_query', _temp_query, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
				end_time := clock_timestamp();
				RAISE NOTICE 'Time taken to create ph_data temp table::::  %', end_time - start_time;

				-- RCL PSM input + resolved
				_rcl_input_query := format(_rcl_input_query_format, _limit_clause);
				raise notice '_rcl_input_query: %', _rcl_input_query;
				start_time := clock_timestamp();
				execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
				_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' with (autovacuum_enabled=false) as ( ' || _rcl_input_query || ' );';
				raise notice '_rcl_input_query: %', _rcl_input_query;
				execute _rcl_input_query;
				execute 'drop table if exists '|| _rcl_psm_resolved_table || ';';
				execute format('create unlogged table %2$s with (autovacuum_enabled=false) as (select product_code, store_code from global.generate_rcl_psm_data(''%1$s'', 32, current_date))', _rcl_input_table, _rcl_psm_resolved_table);
				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to resolve PSM::::  %', end_time - start_time;

				-- Constraints input + resolved
				start_time := clock_timestamp();
				execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
				_rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
					select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
				)', _rcl_input_table, vl_unique_identifier);
				raise notice ' constraints resolution query: % ', _rcl_input_query;
				execute _rcl_input_query;
				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to resolve Constraints::::  %', end_time - start_time;
				execute format('select array_agg(distinct article) from constraints_resolved_data_%1$s', vl_unique_identifier) into _resolved_articles;
				_resolved_articles := coalesce(_resolved_articles, '{}');
				raise notice 'resolved articles: %', _resolved_articles;

				-- Create indexes on dynamic temp tables to avoid sequential scans in the main query
        		start_time := clock_timestamp();
				execute 'CREATE INDEX ON ' || _rcl_psm_resolved_table || ' (product_code, store_code)';
				execute format('CREATE INDEX ON constraints_resolved_data_%1$s (product_code, store_code)', vl_unique_identifier);
				execute 'ANALYZE ' || _rcl_psm_resolved_table;
				execute format('ANALYZE constraints_resolved_data_%1$s', vl_unique_identifier);
				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to index and analyze temp tables::::  %', end_time - start_time;

				-- Build and execute the main query, INSERT INTO result_table
        		start_time := clock_timestamp();
 				_query_combine = format(_query_combine_format, _limit_clause, _offset, _final_get, _limit, _rcl_input_table, _rcl_psm_resolved_table, vl_unique_identifier, _resolved_articles, ph_data_id);
 				raise notice '------------ STRATEGY QUERY ------- : %', _query_combine;

				_temp_query := 'CREATE unlogged TABLE IF NOT EXISTS ' || _result_table || ' as (' || _query_combine || ' where false)';
				execute _temp_query;
				EXECUTE 'INSERT INTO ' || _result_table || ' ' || _query_combine;
				perform global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', '_query_combine', _query_combine, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
 				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to query combine (INSERT)::::  %', end_time - start_time;

				-- Get count from result table (instant, no cursor traversal needed)
 				start_time := clock_timestamp();
				execute('select count(*) from ' || _result_table) into _batch_count;
 				end_time := clock_timestamp();
        		RAISE NOTICE 'Time taken to count result::::  %', end_time - start_time;

 				IF _batch_count = 0 THEN
 					_query_combine_count = format(_query_combine_count_format, _limit_clause);
					start_time := clock_timestamp();
 					EXECUTE _query_combine_count INTO _count;
					perform global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', '_query_combine_count', _query_combine_count, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
					end_time := clock_timestamp();
					RAISE NOTICE 'Time taken to _query_combine_count::::  %', end_time - start_time;
 				END IF;
 				_offset := _offset + _limit;
 				_limit := _limit + _limit;

 			END LOOP;
			raise notice ' dropping the rcl input tables';

			-- Open cursor on the pre-computed result table (instant, no re-execution)
			open $1 for execute('select * from '|| _result_table);
			perform global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Before return', 'select * from '|| _result_table, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
 		RETURN $1;
 	end
 $function$
;