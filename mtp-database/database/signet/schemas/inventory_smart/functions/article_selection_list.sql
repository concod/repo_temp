--liquibase formatted sql
--changeset chaitanyaprasad:article_selection_list_updated_1 runOnChange:true stripComments:false splitStatements:false context:MTP-22370 labels:MTP-22370
--comment: MTP-22370-add-sma-ecom-reserve-col, cursor_tuple_fraction TO 1.0, changed the MV from ph_master to ph_master_sku_dc, updated the query to use ph_master_sku_dc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Create allocation - table 1 SP
  Calling statement: 
 begin;
 set cursor_tuple_fraction TO 1.0;
 select * from inventory_smart.article_selection_list('my_cur'::refcursor,
 '{"l0_name": [{"type": "list", "operator": "in", "values": ["101_BRIDAL"]}], "product_channel_name": [{"type": "list", "operator": "in", "values": ["ZALES OUTLET"]}], "l1_name": [], "l2_name": [], "merchandise_category": [], "planning_ownership": [], "article_status_tag": [{"type": "list", "operator": "not in", "values": ["Old", "Retirement"]}]}',
 '{"channel": [{"type":"list", "operator":"in", "values": ["ZALES"]}]}',
 '{}',
 '{}',
 '{"search": [], "sort": [], "range": [], "limit": {"limit": 100, "page": 1}}');
 FETCH ALL IN "my_cur";
 commit;
   Updated_by       			Updated_on      Purpose
    ----------       			-----------     --------
    Renugopal    	            15-Jun-2023     Intersection of eligilibity group and optimize by l0_name join
  */
 	declare
 		_query_pa text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_channel_filter text := inventory_smart.get_channel_str_from_input($3);
 		_store_active_filter text := '{"active": []}'::jsonb || $3;
 		_query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
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
 		
 	begin 	
		set cursor_tuple_fraction TO 1.0;
 		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master_sku_dc', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master_sku_dc',
 		  _product_filters
 		);
 		
         _query_pa := _query_pa || _ph_search || _ph_sort;
        	_query_pa := replace(_query_pa, '%', '%%');
        	_query_pa := _query_pa || '%1$s';
 				
         if (_channel_filter = '') IS FALSE then
         	_channel_filter := ' WHERE channel in  '||_channel_filter||' ' ;
         end if;
 		
 		_query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master_sku_dc ' || _query_pa || ' ) sq;';
 		_query_combine_format := '
 			with ph_data_without_offset as (
 			  select 
 			    *
 			  from 
 			    inventory_smart.ph_master_sku_dc
 				' || _query_pa || '
 			)
 			, ph_data as(
 				SELECT *, %2$s + ROW_NUMBER () OVER (' || replace(_ph_sort, '%', '%%') || ') as offset
 				FROM ph_data_without_offset
 			)
 			--select * from ph_data
 			, product_dc_map as (
 			select
 				ph.ph_code,
 				channel,
 				ph.product->>''product_code'' as product_code,
 				ph.product->>''size'' as size,
 				pmpd.dc_code,
 				mapping_code
 			from (
 				select
 					ph_code,
 					channel,
 					unnest(product_code_size_map) as product
 				from
 					ph_data) ph
 			join global.product_mapping_product_dc pmpd on
 				ph.product->>''product_code'' = pmpd.product_code
 			)
 			--select * from product_dc_map
 			, sku_dc_available_units as (
 			  select 
 			    ph_code, 
 			    sum(oh) as oh, 
 			    JSONB_OBJECT_AGG(size, oh_map) as oh_map 
 			  from 
 			    (
 			      select 
 			        ph.ph_code, 
 			        ph.size, 
 			        JSONB_OBJECT_AGG(ph.dc_code, oh_map) as oh_map, 
 			        coalesce(
 			          SUM(oh), 
 			          0
 			        ) oh 
 			      from 
 			        product_dc_map ph 
 			        join 
 					(
 				        select product_code, dc_code, sum(oh) as oh, JSONB_OBJECT_AGG(child_sku, oh) as oh_map from 
 				        inventory_smart.sku_dc_available_units 
 				        group by 1, 2
 			      	)
 			 		 au using(product_code, dc_code)
 			      group by 
 			        1, 
 			        2
 			    ) as t 
 			  group by 
 			    1
 			)
 			--select * from sku_dc_available_units
 			, sku_temp_reserve as (
 				   	select 
 				        ph.ph_code, 
 				        ph.size, 
 				        au.dc_code,
				    case when type=''E'' then quantity - round(quantity * coalesce(ROUND((sma_percentage/100)::numeric, 2), 0),0)  else 0 end as dc_ecom_reserve,
					case when type=''E'' then quantity else 0 end as ecom_reserve,
 	                    case when type=''S'' then quantity else 0 end as system_reserve,
 	                    case when type=''U'' then quantity  else 0 end as user_reserve,
					case when type=''NS'' then quantity  else 0 end as new_store_reserve,
					case when type=''E'' then round(quantity * coalesce(ROUND((sma_percentage/100)::numeric, 2), 0),0) else 0 end as sma_reserve
 				      from 
 				        product_dc_map ph 
 				      join 	         
 						inventory_smart.sku_dc_reserved_units au 
 					  using(product_code, dc_code)
					left join inventory_smart.sma_reserve_quantity sma using(product_code)
 				      group by 
 				        1, 
					2,
					3,
					type,
					quantity,
					sma_percentage
 				 )       
 				        
 			, sku_dc_reserved_units as (
 				select 
 					ph_code,
 					sum(tot_quantity) as reserve_quantity,
 					sum(ecom_reserve) as ecom_reserve,
					sum(dc_ecom_reserve) as dc_ecom_reserve,
 				    sum(user_reserve) as user_reserve,
 					sum(new_store_reserve) as new_store_reserve,
 					sum(system_reserve) as system_reserve,
					sum(sma_reserve) as sma_reserve,
 					JSONB_OBJECT_AGG(size, rq_map) as rq_map
 				from (
 					  select 
 					    t.ph_code, 
 					    t.size, 
 					    tot_quantity,
 					    sum(ecom_reserve) as ecom_reserve,
						sum(dc_ecom_reserve) as dc_ecom_reserve,
 					    sum(user_reserve) as user_reserve,
 						sum(new_store_reserve) as new_store_reserve,
 						sum(system_reserve) as system_reserve,
						sum(sma_reserve) as sma_reserve,
 						 JSONB_OBJECT_AGG(dc_code, tot_quantity ) as rq_map
 						--,
 					    --JSONB_OBJECT_AGG(size, rq_map) as rq_map
 					  from 
 		
 						sku_temp_reserve t
 						join (
 							select
 								ph_code,
 								size,
 								dc_code,
 								sum(ecom_reserve) + sum(user_reserve) + sum(new_store_reserve) + sum(system_reserve) as tot_quantity
 							from
 								sku_temp_reserve
 							group by
 								1,
 								2,
 								3
 						) ss
 						using(ph_code, size, dc_code)
 							  group by 
 						    1,2,3
 						) b
 						group by 1
 				) 
 				--select * from sku_dc_reserved_units
 					
 
 			, sku_dc_allocated_units as (
 			  select 
 			    ph_code, 
 			    SUM(allocated_units) as allocated_units, 
 			    JSONB_OBJECT_AGG(size, au_map) as au_map, 
 			    max(allocated_time) as allocated_time 
 			  from 
 			    (
 			      select 
 			        ph.ph_code, 
 			        ph.size, 
 			        SUM(quantity) as allocated_units, 
 			        JSONB_OBJECT_AGG(ph.dc_code, au_map) as au_map, 
 			        max(allocated_time) as allocated_time 
 			      from 
 			        product_dc_map ph 
 			        join (
 				        select product_code, dc_code, max(updated_at) as allocated_time, sum(quantity) as quantity, JSONB_OBJECT_AGG(coalesce (sub_sku, ''''), quantity) as au_map
 				        from inventory_smart.sku_dc_allocated_units
 				        group by 1,2
 					) al 
 			        using(product_code, dc_code)
 			      group by 
 			        1, 
 			        2
 			    ) as t 
 			  group by 
 			    1
 			)
 			--select * from sku_dc_allocated_units
 			, product_store_dc_mapping as (
 			  select 
 			    pmps.mapping_code, 
 				pmps.product_code,
 			    pmps.store_code, 
 			    ph_code,
				pmps.l0_name,
 				saf.channel,
 				pmsd.dc_code
 			  from 
 			    ph_data ph 
 			    join global.product_mapping_product_store pmps on pmps.l0_name = ph.l0_name and pmps.product_code = any(ph.product_codes) 
 				    join (' || replace(_query_sa, '%', '%%') || ') saf 
 				    using(store_code)
  				    join product_dc_map using(ph_code)
  				    JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)  
 				where 
 				    pmps.is_active = true and CURRENT_DATE <@ pmps.validity and saf.active = true
 			    -- join global.store_attributes_filter saf on ph.channel = saf.channel 
 			    -- and pmps.store_code = saf.store_code
 
 			)
 			--select * from product_store_dc_mapping
 			,
  			product_store_mapping as ( 
  				select
  					mapping_code,
  					product_code,
  					store_code,
  					ph_code,
					l0_name,
  					channel
  				from product_store_dc_mapping
  				group by 1,2,3,4,5,6
  			
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
				join global.store_groups_mapping sgm on sgm.sg_code = esg.default_sg_code
				group by 1, 2, 3
			)			
			--select * from elligible_stores_mapping;
			, mapping_constraint_elligible_join as (
				-- for case when ph_config row exists for this ph_code, channel
			 	select 
 			        ph_code, 
 					psm.channel,
 			        cm.store_code, 
 			        aps as aps, 
 			        wos as wos 
 			      from 
 			        product_store_mapping psm 
 			        join elligible_stores_mapping esm using(ph_code, store_code, channel)
 			        --left join inventory_smart.constraint_master cm using(mapping_code) --CHANGE 2
 						-- reason - we do not want null store_codes when we do left join
 						-- we do not need articles with absolutely no store mapping at all
 					join inventory_smart.constraint_master cm using(mapping_code, l0_name)
 					   -- join inventory_smart.constraint_master cm using(product_code, store_code) 
                union 
                
				-- for case where ph_config does not have row or sg is empty list - we take all valid mappings
                select 
                ph_code, 
                        psm.channel,
                cm.store_code, 
                aps as aps, 
                wos as wos 
              from 
                product_store_mapping psm 
                left join elligible_stores_mapping esm using(ph_code, store_code, channel)
                --left join inventory_smart.constraint_master cm using(mapping_code) --CHANGE 2
                                -- reason - we do not want null store_codes when we do left join
                                -- we do not need articles with absolutely no store mapping at all
                join inventory_smart.constraint_master cm using(mapping_code)
                where esm.ph_code is null

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
 			    product_store_dc_mapping psm 
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
 				  ph.l2_name, 
 				  ph.ph_code, 
 				  ph.article, 
 				  ph.article_status_tag, 
 				  ph.merchandise_category, 
 				  ph.merchandise_brand,
 				  ph.planning_ownership, 
 				  ph.product_description, 
 				  ph.child_skus, 
 				  ph.product_channel_name, 
 				  ph.product_code_size_map, 
 				  ph.sizes, 
				  ph.store_pack_size,
 				  ph.product_codes as upc,
 				  cd.channel,
 			    coalesce(reserve_quantity, 0) as reserve_quantity, 
 			    coalesce(ecom_reserve, 0) as ecom_reserve, 
				coalesce(dc_ecom_reserve, 0) as dc_ecom_reserve,
 				coalesce(new_store_reserve, 0) as new_store_reserve,
 				coalesce(system_reserve, 0) as system_reserve,
				coalesce(user_reserve, 0) as user_reserve,
				coalesce(sma_reserve, 0) as sma_reserve_qty,
                 coalesce(oh, 0) as oh,
 			    (coalesce(oh, 0) - coalesce(reserve_quantity, 0)) as total_inventory, 
 			    oh_map, 
 			    rq_map, 
 			    coalesce(allocated_units, 0) as allocated_units, 
 			    ((coalesce(oh,0) - coalesce(reserve_quantity,0)) - coalesce(allocated_units,0)) as net_available_inventory, 
 			    au_map,
 			    case
 					when udpp is null and iapp is null then ''{}''
 					when iapp = udpp then iapp
 					when udpp is not null then array[udpp[1] || ''{"is_default": true}'', iapp[1] || ''{"is_default": false}'']
 					else iapp end as product_profiles, 
 			    allocated_time, 
 			    -- iapp as ia_product_profiles,
 			    -- udpp as ud_product_profiles,
 			    dcs, 
 				case
 					when store_groups is null then store_groups || jsonb_build_object(
 				      ''value'', -1, ''label'', ''Default - Mapping'', 
 				      ''is_default'', true
 				    )
 					else store_groups || jsonb_build_object(
 				      ''value'', -1, ''label'', ''Default - Mapping'', 
 				      ''is_default'', false
 				    )
 				end as store_groups, 
 			   -- store_groups || jsonb_build_object(
 			   --   ''value'', -1, ''label'', ''Default - Mapping'', 
 			   --   ''is_default'', true
 			   -- ) as store_groups,
 			    cd.mapped_stores_count, 
 			    cd.mapped_stores, 
 			    cd.aps, 
 			    cd.wos 
 			  from 
 			    ph_data ph 
 				' || (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then 'left' else '' end) || '
 				join article_sg_config asgc on ph.ph_code = asgc.ph_code 
 			    left join sku_dc_reserved_units ru on ph.ph_code = ru.ph_code 
 			    left join sku_dc_available_units avu on ph.ph_code = avu.ph_code 
 			    left join sku_dc_allocated_units alu on ph.ph_code = alu.ph_code 
 			    left join constraint_data cd on ph.ph_code = cd.ph_code 
 			    --left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code
 				left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code   --TODO has to be reverted once we have IA product profiles for all articles
 			    join article_dc_config adc on ph.ph_code = adc.ph_code -- inner join to filter out articles that doesnt have article - store mapping
 			    left join article_udpp_config ppu on ph.ph_code = ppu.ph_code 
 			  where 
 			    (coalesce(oh, 0) - coalesce(allocated_units, 0)) > 0
 			)%3$s';
 		raise notice 'qcc: %', _query_combine;
 			WHILE _count > 0 AND _batch_count = 0 LOOP
 				_limit_clause := ' LIMIT ' || _limit || ' OFFSET ' || _offset;
 				_query_combine = format(_query_combine_format, _limit_clause, _offset, _final_get, _limit);	
 				raise notice 'A: %', _query_combine;
 				OPEN $1 SCROLL FOR EXECUTE _query_combine;
 			    
 				
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
