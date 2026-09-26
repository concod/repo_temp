--liquibase formatted sql
--changeset liquibase:constraints_store_group_list runOnChange:true stripComments:false splitStatements:false context:MTP-83719 labels:MTP-83719
--comment: MTP-83719
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_group_list(input refcursor, jsonb, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_group_list(input refcursor, jsonb, jsonb, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_application_code int := $4;
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'application_code', $4);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.constraints_store_group_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.constraint_master_factory_line_retail,inventory_smart.constraint_master_full_line_retail}';
		
		_query_combine_format text := '';
		_query_combine_count_format text := '';
		_query_combine_count text := '';
        _count int := 1;
		_batch_count int := 0;
		_ph_sort text ;
		_ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
		_sub_limit int;
		_sub_offset int;
		_column_sort text := '';
		_ph_data_select text := '*, %1$s as offset';
		_select text := '"offset",';
		_final_result_select text := '%2$s as limit, ROW_NUMBER () OVER () as sub_offset,';
		_final_result_limit text := 'LIMIT %4$s OFFSET %3$s';
		_group_by_clause text := 'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19';
		_temp_str text;
		_val text;
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		l0_name_updated text := '';
	begin
		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
		
		if _limit <> -1 then 
			_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
		else 
			_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort;
		   --since download is True we need to make our select statements empty
			_ph_data_select = '*';
			_select = '';
			_final_result_select = '';
			_final_result_limit = '';
			_group_by_clause = 'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18';
		end if;

		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);

		if $2->'sizes' IS NOT NULL THEN
	        select value into _temp_str from json_each_text($2::json) where key='sizes';
	       	select concat(jsonb_agg(value)) into _val from json_array_elements_text(((json_extract_path(_temp_str::json, '0')::json)->>'values')::json);
	      	_temp_str =  replace(replace(replace(_val,'"',''''),'[',''),']','');
			RAISE NOTICE 'size %',_temp_str;
			_temp_str = 'where product->>''size'' in (' || _temp_str || ')';
			RAISE NOTICE ' _temp_str %',_temp_str;   	
	    ELSE
	       	_temp_str = ''; 
	    END IF;
 		
		--_query_table_filters := global.form_table_query($5);
		_query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';
		_query_combine_format := '
			with ph_data_without_offset as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				' || _query_pa || '
			)
			, ph_data as(
				SELECT '|| _ph_data_select || '
				FROM ph_data_without_offset
			),
			product_master_filters_data as (
	 			SELECT 
	 			  pmps.product_code, 
					pmps.mapping_code,
	 			  channel, 
	 			  paf.product_description,
				  paf.model_description, 
				  paf.style_color_id,
	 			  paf.style,
	 			  paf.color,
	 			  paf.article_status_tag,
	 			  product->>''size'' as size,
				  product->>''order'' as size_order,
	 			  paf.article, 
				  '|| _select ||'
	 			  paf.l0_name, 
	 			  paf.l1_name, 
				  paf.l2_name,
                  paf.l3_name,
	 			  paf.l4_name,
					paf.brand,
				  paf.supersede_flag
	 			FROM 
	 			  (
	 			    select 
	 			      *,
	 			      unnest(product_code_size_map) as product
	 			    from 
	 			      ph_data
	 			  ) paf 
	 			  join (select mapping_code, product_code, store_code from global.product_mapping_product_store pmps where l0_name = '||l0_name_updated||') pmps on paf.product->>''product_code'' = pmps.product_code
				  join (
 					      select *
 					      FROM 
 					        global.store_attributes_filter saf 
 					      	' || _query_sa || '
 					    ) saf using(store_code, channel)
				  '|| _temp_str || '
	 		)
--			select * from product_master_filters_data
			,constraint_data as (
				select 
				  pmps.product_code, 
	 			  pmps.channel, 
	 			  pmps.product_description,
				  pmps.model_description, 
				  pmps.style_color_id,
	 			  pmps.style,
	 			  pmps.color,
	 			  pmps.article_status_tag,
	 			  concat('''', pmps.size) as size,
				  pmps.size_order,
	 			  pmps.article, 
				  '|| _select ||'
	 			  pmps.l0_name, 
	 			  pmps.l1_name, 
				  pmps.l2_name,
                  pmps.l3_name,  
	 			  pmps.l4_name,
					pmps.brand,
				  pmps.supersede_flag
				FROM inventory_smart.constraint_master c
 			    join product_master_filters_data pmps using(mapping_code,l0_name)
				where c.l0_name = '||l0_name_updated||'
				and c.mapping_code is not null
				'|| _group_by_clause ||'
				order by article ASC, size_order ASC
			),
 			final_result AS (
			  select
			  	'|| _final_result_select ||'
			    c.*
			  from 
			    constraint_data c  
				WHERE TRUE '|| _overall_search ||'
			),
			final_result_with_offset AS (
				select 
			  		* 
				from 
			  		final_result 
			  		'|| _final_result_limit ||'
			)
			select 
			  %5$s 
			from 
			  final_result_with_offset';
		if _limit <> -1 then 
	 		raise notice 'Query: %', _query_combine;
	 		WHILE _count > 0 AND _batch_count = 0 loop
					raise notice 'llllooopppp % %', _count, _batch_count;
					raise notice ' loop % % % %', _limit, _offset, _sub_offset, _sub_limit;
					_query_combine = format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, '*');	
					raise notice ' %', _query_combine;
					OPEN $1 FOR EXECUTE _query_combine ;
					raise notice 'query executed1';
	
					execute format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, 'count(*)') into _batch_count;
					raise notice ' batch count %', _batch_count;
					IF _batch_count = 0 THEN
						_query_combine_count = format(_query_combine_count_format, _offset,_limit);
						raise notice ' %', _query_combine_count;
						EXECUTE _query_combine_count INTO _count;
						raise notice ' count %', _count;
					END IF;
					_offset := _offset + _limit;
					_limit := _limit + _limit;
					_sub_offset := 0;
					raise notice 'tttt % %', _count,_batch_count;
					IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
				END LOOP;
		else 
			_query_combine = format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, '*');	
			raise notice ' %', _query_combine;
			open $1 for execute _query_combine;
		end if;
		RETURN $1;
 	end
 $function$
;