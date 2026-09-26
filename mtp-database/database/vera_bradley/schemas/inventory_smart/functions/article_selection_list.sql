--liquibase formatted sql
--changeset liquibase:article_selection_list runOnChange:true stripComments:false splitStatements:false context:MTP-34258 labels:MTP-34258
--comment: MTP-34258-test-strat-table-round-off
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
/*
 * 
  Strategy Screen SP
  -------------------
  Inputs :- 
  -------
  $1 - refcursor
  $2 - ph_master attributes (product and article_status_tag)
  $3 - store attribute filters - mainly for channel
  $4 - integer list of store group ids - used when we had store group filter
  $5 - array of PO ids
  $6 - table search sort
  ----------
  SP Call :-
  --------
	begin;
	select * from inventory_smart.article_selection_list('my_cur'::refcursor,
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Apparel/Footwear"]}], "l1_name": [], "l2_name": [], "merchandise_category": [], "planning_ownership": [], "article_status_tag": [{"type": "list", "operator": "not in", "values": ["Old", "Retirement"]}]}',
	'{"channel": [{"type":"list", "operator":"in", "values": ["Factory Line Retail"]}]}',
	'{}',
	'{}',
	'{"search": [], "sort": [], "range": [], "limit": {"limit": 100, "page": 1}}');
	FETCH ALL IN "my_cur";
	commit;
--------
  Docs :-
  -------
  Currently no cache is used
 * 
 */
	declare
		_inv text := 'ph.dc_code';
		_inventory_query text := '';
		_po_id text := '';
		_po_filter text := '';
		_article_dc_config text := '';
		_dc_mapping_reserve_inventory text :='';
		_allocated_reserve text :='(
			select
				article,
				channel,
				dc_code,
				size,
				max(updated_at) updated_at, 
				coalesce(sum(quantity), 0) quantity
			from
				inventory_smart.sku_dc_allocated_units sdau
			group by
				1,
				2,
				3,
				4) x
				using (article,
			channel)';
		_inv_source text := '
			(
			select
				*
			from
				(
				select
					article,
					channel,
					array_agg(distinct pack_type_id) pack_type_id,
					array_agg(distinct parent_article) parent_article,
					array_agg(pack_description) pack_description
				from
					inventory_smart.sku_dc_available_units
				where
					type = ''S''
				group by
					1,
					2) a
			right join (
				select
					article,
					channel,
					dc_code,
					size,
					coalesce(sum(oh), 0) oh
				from
					inventory_smart.sku_dc_available_units sdau
				group by
					1,
					2,
					3,
					4) b
					using (article,
				channel)) 
						x
				using (article,
			channel,
			size) ';
		_query_pa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_product_filters jsonb := $2  || ('{"channel": [{"type": "list", "operator": "in", "values": ["' || _channel || '"]}]}')::jsonb;
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
	
--         for _key, _val in SELECT * FROM jsonb_each_text($6)	WHERE value IS NOT NULL loop
--             if _key = 'sort' then
--                 for _filter in SELECT * FROM json_array_elements(_val::json) loop
--                     if (_filter::json)->>'column' in (SELECT * FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name  = 'ph_master') then
--                         _ph_sort_arr := array_append(_ph_sort_arr, (_filter::json)->>'column' || (_filter::json)->>'order');
--                     end if;
--                 end loop;
-- 			end if;
--             if _key = 'search' then
--                 for _filter in SELECT * FROM json_array_elements(_val::json) loop
--                     if (_filter::json)->>'column' in (SELECT * FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name  = 'ph_master') then
--                         _ph_search_arr := array_append(_ph_search_arr, (_filter::json)->>'query');
--                     else
--                         _overall_search_arr := array_append(_overall_search_arr, (_filter::json)->>'query');
--                     end if;
--                 end loop;
-- 			end if;
--             if _key = 'limit' then
--                 _limit = ((_val::json)->>'limit')::int;
--                 _offset = ((_val::json)->>'offset')::int;
-- 				end if;
-- 		end loop;
-- 		if cardinality(_ph_sort_arr) > 0 then _ph_sort = ' ORDER BY ' || (ARRAY_TO_STRING(_ph_sort_arr, ', ', ''));
-- 		end if;

		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
		_query_pa := inventory_smart.form_main_table_filters(
		  'ph_master',
		  _product_filters
		);		
		raise notice ' % %', _product_filters, $2;
		_query_pa := _query_pa || _ph_search || _ph_sort;
       	_query_pa := replace(_query_pa, '%', '%%');
       	_query_pa := _query_pa || '%1$s';
		
		--foreach _po_id in array $5 loop
		--	raise notice 'B: %', _po_id;
       -- end loop;
       --raise notice 'CCCC: %',ARRAY_TO_STRING( $5, ', ', '');
      
      	_inventory_query := 'sku_dc_available_units as (
			  select 
			    ph_code,
				pack_type_id, 
				parent_article,
				pack_description,
			    sum(oh) as oh, 
			    JSONB_OBJECT_AGG(size, oh_map) as oh_map 
			  from 
			    (
			      select 
			        ph.ph_code, 
			        ph.size, 
					pack_type_id,
					parent_article,
					pack_description,
			        JSONB_OBJECT_AGG('|| _inv ||', oh) as oh_map, 
			        coalesce(
			          SUM(oh), 
			          0
			        ) oh 
			      from 
			        product_dc_map ph 
			        join ' || _inv_source || ' 
			      group by 
			        1, 
			        2,
					3,
					4,
					5
			    ) as t 
				--where pack_type_id is not null
			  group by 
			    1,2,3,4
			)';
		
		
		--raise notice 'B: %', _inventory_query;
		
		_dc_mapping_reserve_inventory := ' , product_dc_map as (
			select
				''po'' as po,
				ph.ph_code,
				channel,
				article,
				ph.product->>''product_code'' as product_code,
				ph.product->>''size'' as size,
				pmpd.dc_code,
				mapping_code
			from (
				select
					ph_code,
					channel,
					article,
					unnest(product_code_size_map) as product
				from
					ph_data) ph
			join global.product_mapping_product_dc pmpd on
				ph.product->>''product_code'' = pmpd.product_code
			)
			--select * from product_dc_map
			, ' || _inventory_query || '
			--select * from sku_dc_available_units
			, sku_dc_reserved_units as (
			  select 
			    ph_code, 
			    SUM(reserve_quantity) as reserve_quantity, 
			    JSONB_OBJECT_AGG(size, rq_map) as rq_map
			  from 
			    (
			      select 
			        ph.ph_code, 
			        ph.size, 
			        SUM(quantity) as reserve_quantity, 
			        JSONB_OBJECT_AGG(ph.dc_code, quantity) as rq_map
			      from 
			        product_dc_map ph 
			        join (select article, channel, dc_code, size, coalesce(sum(quantity), 0) quantity from inventory_smart.sku_dc_reserved_units sdau group by 1,2,3,4) x using (article, channel)
			      group by 
			        1, 
			        2
			    ) as t 
			  group by 
			    1
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
			        JSONB_OBJECT_AGG(ph.dc_code, quantity) as au_map, 
			        max(updated_at) as allocated_time 
			      from 
			        product_dc_map ph 
			        join ' || _allocated_reserve || '  
			      group by 
			        1, 
			        2
			    ) as t 
			  group by 
			    1
			)
			--select * from sku_dc_allocated_units
			';
		--raise notice 'B: %', _dc_mapping_reserve_inventory;
		
		_article_dc_config := '			
			, selected_dc_data as (
			  SELECT 
			    ph_code, 
			    dc.dc_code, 
			    dc.name 
			  FROM 
			    product_store_mapping psm 
			    JOIN global.product_mapping_store_dc pmsd USING(store_code) 
			    join global.distribution_centres dc using(dc_code) 
			  GROUP BY 
			    1, 
			    2, 
			    3
			)
			--select * from selected_dc_data
			, article_dc_config as (
			  select 
			    sdc.ph_code, 
			    array_agg(
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
			        join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)
			    ) pcm 
			    right join selected_dc_data sdc on pcm.ph_code = sdc.ph_code 
			    and pcm.default_dc_code = sdc.dc_code 
			  group by 
			    1
			)
			--select * from article_dc_config
		';
       

		if ARRAY_LENGTH($5, 1) >0
			then
				--_po_filter := '('''; 
				--foreach _po_id in array $5 loop
				-- _plan_code || ''', '''
				--	_po_filter := _po_filter || ''' || _po_id || ''',' ;
				
		      --  end loop;
				_inv := ' po ';
		        _inv_source := ' (
							select
								po_code,
								product_code,
								channel,
								sum(oh) as available_qty
							from
								inventory_smart.sku_po_available_units
							group by
								1,
								2,
								3) au
							 using(product_code, channel) 
							where po_code in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') ';
		       	_allocated_reserve := 'inventory_smart.sku_po_allocated_units';

				_inventory_query := '
				sku_dc_available_units as (
					  select 
					    ph_code, 
					    sum(available_qty) as oh, 
						'''' as pack_type_id,
						'''' as parent_article,
						'''' as pack_description,
					    JSONB_OBJECT_AGG(size, oh_map) as oh_map 
					  from 
					    (
					      select 
					        ph.ph_code, 
					        ph.size, 
					        JSONB_OBJECT_AGG('|| _inv ||', available_qty) as oh_map, 
					        coalesce(
					          SUM(available_qty), 
					          0
					        ) available_qty 
					      from 
					        product_dc_map ph 
					        join ' || _inv_source || ' 
					      group by 
					        1, 
					        2
					    ) as t 
					  group by 
					    1
					)';
				
				_dc_mapping_reserve_inventory := '
					, product_dc_map as (
					select
						''po'' as po,
						ph.ph_code,
						channel,
						ph.product->>''product_code'' as product_code,
						ph.product->>''size'' as size
					from (
						select
							ph_code,
							channel,
							unnest(product_code_size_map) as product
						from
							ph_data
						) ph
					)
					--select * from product_dc_map
					, ' || _inventory_query || '
					--select * from sku_dc_available_units
					, sku_dc_reserved_units as (
					  select 
					    ph_code, 
					    0 as reserve_quantity, 
					    null as rq_map
					  from 
					      product_dc_map ph 
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
								JSONB_OBJECT_AGG('|| _inv ||', quantity) as au_map, -- dc_code = po_code 
						        --JSONB_OBJECT_AGG(al.dc_code, quantity) as au_map, -- dc_code = po_code
						        max(updated_at) as allocated_time 
						      from 
						        product_dc_map ph 
						        join ' || _allocated_reserve || ' al 
						        using(product_code, channel)
								-- only calculate allocated reserve wrt the exact po id
							  where dc_code in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') -- dc_code = po_code 
						      group by 
						        1, 
						        2
						    ) as t 
						  group by 
						    1
						)
						--select * from sku_dc_allocated_units
				';
			
				_article_dc_config := '
	
					--select * from selected_dc_data
					, article_dc_config as (
					  select 
					    ph_code, 
					    array_agg(
					      jsonb_build_object(
					        ''value'', '|| _inv ||' , ''label'', ''PO'', 
					        ''is_default'', true
					      )
					    ) as dcs 
					  from 
						product_dc_map
						group by 1
					)
					--select * from article_dc_config
				';
		
			end if;
		_query_combine_count_format := '
		SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';
		_query_combine_format := '
			with ph_data_without_offset as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				' || _query_pa || '
			)
			, ph_data as(
				SELECT *, %2$s + ROW_NUMBER () OVER (' || replace(_ph_sort, '%', '%%') || ') as offset
				FROM ph_data_without_offset
			)
			--select * from ph_data
			' || _dc_mapping_reserve_inventory || '

			, product_store_mapping as (
			  select 
			    mapping_code, 
			    pmps.store_code, 
			    ph_code 
			  from 
			    ph_data ph 
			    join global.product_mapping_product_store pmps on pmps.l0_name = ph.l0_name and pmps.product_code = any(ph.product_codes) 
			    join global.store_attributes_filter saf --on ph.channel = saf.channel 
			    on pmps.store_code = saf.store_code
				where is_active = true  and DATE(timezone(''EST'', NOW()))  <@ validity and active =true
				-- pmps.validity is not null 
			)
			--select * from product_store_mapping
			, constraint_data as (
			  select 
			    ph_code, 
			    ROUND(
			      AVG(aps):: numeric, 
			      2
			    ) as aps, 
			    ROUND(
			      AVG(wos):: numeric, 
			      2
			    ) as wos, 
			    array_agg(store_code) as mapped_stores, 
			    array_length(
			      array_agg(store_code), 
			      1
			    ) as mapped_stores_count 
			  from 
			    (
			      select 
			        ph_code, 
			        cm.store_code, 
			        SUM(aps) as aps, --if there is null then it remains null and not considered in average
					-- null + 1 = 1 -> one product code having null while other is not, will be considered
			        AVG(wos) as wos 
			      from 
			        product_store_mapping psm 
			        --left join inventory_smart.constraint_master cm using(mapping_code) 
					join inventory_smart.constraint_master cm using(mapping_code) 
				  where  channel = '''|| replace(_channel, '%', '%%') ||'''
			      group by 
			        1, 
			        2
			    ) foo 
			  group by 
			    1
			)
			--select * from constraint_data

			, product_profiles_ia as (
			  select 
			    ph.ph_code, 
			    jsonb_build_object(
			      ''value'', pp_code, ''name'', name, ''label'', 
			      special_classification
			    ) as iapp 
			  from 
			    ph_data ph 
			    join inventory_smart.product_profile_master ppm using(ph_code) 
			  where 
			    special_classification = ''ia-recommended''
			)
			--select * from product_profiles_ia
			' || _article_dc_config || '

			, article_udpp_config as (
			  select 
			    ph.ph_code, 
			    jsonb_build_object(
			      ''value'', pp_code, ''name'', name, ''label'', 
			      special_classification
			    ) as udpp 
			  from 
			    ph_data ph 
			    join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel) 
			    join inventory_smart.product_profile_master ppm on pcm.default_product_profile = ppm.pp_code
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
			        unnest(default_store_groups) as default_sg_code 
			      from 
			        ph_data ph 
			        join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)' || 
			        (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then
			        '' else ' where default_store_groups @> ''' || concat(_sg_codes) || '''::int4[]'
			        end)
			    || ') pcm 
			    join global.store_groups sg on pcm.default_sg_code = sg.sg_code 
			  group by 
			    1
			)
			,inventory_stats as (
				SELECT 
					article,
					coalesce(sum(week_to_date_sales), 0) as week_to_date_sales, 
					coalesce(sum(last_day_sales), 0) as last_day_sales, 
					coalesce(sum(sales_1_ago), 0) as sales_1_ago, 
					coalesce(sum(sales_2_ago), 0) as sales_2_ago, 
					coalesce(sum(sales_3_ago), 0) as sales_3_ago, 
					coalesce(sum(sales_4_ago), 0) as sales_4_ago,
					round( coalesce (avg(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc,
					round(coalesce(sum(lw_margin), 0)::decimal,2) as lw_margin,
					coalesce(sum(lw_qty), 0) as lw_qty,
					round(coalesce(sum(lw_revenue), 0)::decimal, 2) as lw_revenue,
					round(coalesce((sum(lw_revenue) / nullif( sum(lw_qty), 0 )),0)::decimal,2) as price,
					round(coalesce(avg(promo_percentage),0)::decimal,2) as promo,
					round(coalesce(sum(sales_revenue_1_ago), 0)::decimal, 2) as sales_revenue_1_ago,
					round(coalesce(sum(sales_revenue_2_ago), 0)::decimal, 2) as sales_revenue_2_ago,
					round(coalesce(sum(sales_revenue_3_ago), 0)::decimal, 2) as sales_revenue_3_ago,
					round(coalesce(sum(sales_revenue_4_ago), 0)::decimal, 2) as sales_revenue_4_ago,
					round(coalesce(sum(week_to_date_sales_revenue), 0)::decimal, 2) as week_to_date_sales_revenue,
					round(coalesce(sum(last_day_sales_revenue), 0)::decimal, 2) as last_day_sales_revenue
				from
					inventory_smart.article_inventory_dashboard
				where channel = '''|| replace(_channel, '%', '%%') ||''' and store_code not in (select name from global.distribution_centres)
				group by
					article

			)
			--select * from article_sg_config
			, final_result as (
			  select 
			  	%4$s as limit,
				ph.offset,
 				ph.l0_name, 
 			    ph.l1_name, 
 			    ph.l2_name, 
 			    ph.l3_name, 
 			    ph.style, 
 			    ph.article,
 				ph.ph_code,
 			    ph.style_description, 
 			    ph.sizes, 
				ph.fabrication,
 			    ph.product_codes as upc, 
 			    ph.color, 
 			    ph.color_code, 
 			    ph.launch_date, 
  				ph.clearance_start_date,
  				ph.retirement_date,
 			    ph.article_status_tag,
				ph.selling_collection,
 			    string_to_array(ph.channel, '','')  as channel, 
 				coalesce(u.factor, 1)  as case_pack_qty,
 				ii.week_to_date_sales,
 				ii.last_day_sales,
				ii.sales_1_ago,
				ii.sales_2_ago,
				ii.sales_3_ago,
				ii.sales_4_ago,
 			    ii.lw_margin,
				ii.lw_qty,
				ii.lw_revenue,
    			ii.price,
				ii.promo,
				ii.sales_revenue_1_ago,
                ii.sales_revenue_2_ago,
                ii.sales_revenue_3_ago,
                ii.sales_revenue_4_ago,
                ii.week_to_date_sales_revenue,
                ii.last_day_sales_revenue,
 			    coalesce(reserve_quantity, 0) as reserve_quantity, 
 			    coalesce(oh, 0) as oh,
 				pack_type_id,
				parent_article,
				pack_description,
 			    (coalesce(oh, 0) - coalesce(reserve_quantity, 0)) as total_inventory, 
 			    oh_map, 
 			    rq_map, 
 			    coalesce(allocated_units, 0) as allocated_units, 
 			    ((coalesce(oh,0) - coalesce(reserve_quantity,0)) - coalesce(allocated_units,0)) as net_available_inventory, 
 			    au_map,
 			    case
 					when udpp is null then array[iapp || ''{"is_default": true}'']
 					when iapp = udpp then array[iapp || ''{"is_default": true}'']
 					else array[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}''] end as product_profiles, 
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
 			    cd.wos ,
 				coalesce(ii.available_stores_perc, 0) as available_stores_perc
			  from 
			    ph_data ph 
				' || (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then 'left' else '' end) || '
				join article_sg_config asgc on ph.ph_code = asgc.ph_code 
			    left join sku_dc_reserved_units ru on ph.ph_code = ru.ph_code 
			    left join sku_dc_available_units avu on ph.ph_code = avu.ph_code 
			    left join sku_dc_allocated_units alu on ph.ph_code = alu.ph_code 
			    left join constraint_data cd on ph.ph_code = cd.ph_code 
			    left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code 
			    join article_dc_config adc on ph.ph_code = adc.ph_code 
			    left join article_udpp_config ppu on ph.ph_code = ppu.ph_code 
				left join inventory_stats ii on ii.article = ph.article
				left join inventory_smart.uom u on ph.style = u.item_id
			  where 
			    (coalesce(oh, 0) - coalesce(allocated_units, 0)) > 0
			) %3$s';
			--raise notice 'A: %', _query_combine_format;
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
