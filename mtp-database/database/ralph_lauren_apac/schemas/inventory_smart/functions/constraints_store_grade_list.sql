--liquibase formatted sql
--changeset liquibase:constraints_store_grade_list runOnChange:true stripComments:false splitStatements:false context:MTP-82691 labels:MTP-82691
--comment: MTP-82691-1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_grade_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_grade_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 calling_statement :
BEGIN;
select * from inventory_smart.constraints_store_grade_list('my_cur'::refcursor, '{
    "l0_name":  [{"type": "list","operator": "in","values": ["Accessories"]}],
    "l1_name":  [],
    "l2_name":  [],
    "l3_name":  [],
    "l4_name":  [],
    "style":  [],
    "style_description":  [],
    "article":  [],
    "color":  [],
    "color_code":  [],
    "human_readable_color":  [],
    "launch_date":  [],
    "assortment_indicator":  [],
    "factory_type":  [],
    "article_status_tag":  []
}'::jsonb,
'{"channel": [{"type": "list", "operator":  "in", "values": ["Factory Line Retail"]}]}'::jsonb,
'{}'::jsonb);
FETCH ALL IN "my_cur";
select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
	"sort":  [],
	"limit":  {
		"limit":  100,
		"page":  1
	}
}');
COMMIT;
		 Modified by : kailash Yadav  18-Aug-2022
	 Jira Ticket : https://impactanalytics.atlassian.net/browse/DAT-115
 */
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.constraints_store_grade_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
--		_cache_dependencies text[] := '{inventory_smart.constraint_master}';
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
		--_group_by_clause text := 'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18';
		_temp_str text;
        _val text;
	begin 		
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		
		if _limit <> -1 then 
			_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
		else 
			_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort;
		   --since download is True we need to make our select statements empty
			_ph_data_select = '*';
			_select = '';
			_final_result_select = '';
			_final_result_limit = '';
			--_group_by_clause = 'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17';
		end if;
	
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
		
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	
		raise notice '%', _query_pa;
 		raise notice '%', _query_sa;
 		--_query_table_filters := global.form_table_query($4);
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
			product_master_filters_data AS (
			    SELECT
					product->>''product_code'' as product_code,
					-- pmps.mapping_code,
					product->>''size'' as size,
					product->>''order'' as size_order,
				   	asg.store_code,
					paf.channel,
					paf.article,
					paf.l0_name,
					paf.l1_name,
                    paf.l3_name,
					paf.l4_name,
					paf.product_description,
					paf.model_description,
					paf.style_color_id,
					paf.article_status_tag,
					paf.color,
					paf.brand,
					paf.supersede_flag,
					'|| _select ||'
					paf.l2_name
				FROM (select *, unnest(product_code_size_map) as product FROM ph_data) paf
				-- join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name 
			    join inventory_smart.article_store_grade asg using 	(ph_code)	
			    -- join (select store_code, channel FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    -- on saf.store_code = pmps.store_code
				'|| _temp_str || '
			)
--			select * from product_master_filters_data
			,
			constraint_data AS (
			    SELECT distinct
				   pmps.product_code,
				   pmps.size,
				   pmps.size_order,
				   pmps.channel,
				   '|| _select ||'
					pmps.article,
					pmps.l0_name,
					pmps.l1_name,
					pmps.l2_name,
					pmps.l3_name,
					pmps.l4_name,
					pmps.article_status_tag,
					pmps.product_description,
					pmps.model_description,
					pmps.style_color_id,
					pmps.color,
					pmps.brand,
					pmps.supersede_flag
			    -- FROM inventory_smart.constraint_master c
			    FROM product_master_filters_data pmps
				-- using(mapping_code, l0_name)
				-- where c.l0_name in (select distinct l0_name from product_master_filters_data)
				-- and c.channel = ''' || _channel || ''' and c.mapping_code is not null
				order by product_code
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