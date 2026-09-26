--liquibase formatted sql
--changeset liquibase:constraints_store_grade_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-22991, MTP-22990
--comment: bugfix:MTP-22991, MTP-22990 - fixed record duplicate issue
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
  	begin 		
  		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'inventory_smart', 'ph_master') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
 		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
 		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
 		_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
 		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
 		
  		
  		raise notice '%', _query_pa;
  		raise notice '%', _query_sa;
  		_query_table_filters := global.form_table_query($4);
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
 				SELECT *, %1$s as offset
 				FROM ph_data_without_offset
 			),
  			product_master_filters_data AS (
  			    SELECT
  					pmps.product_code,
  					pmps.mapping_code,
  					product->>''size'' as size, 
  				   	--asg.store_code,
					style,
					style_description,
          			color,
					color_code,
  					saf.channel,
  					paf.article,
  					paf.l0_name,
 					"offset",
  					paf.l1_name,
  					paf.l2_name,
 					paf.clearance_start_date,
  					paf.launch_date,
  					paf.retirement_date,
					paf.selldown_date,
					asg.grade,
					paf.clearance_end_date

  				FROM (select *, unnest(product_code_size_map) as product FROM ph_data) paf
				join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name	
  			    join inventory_smart.article_store_grade asg using 	(article,store_code)	
  			    join (select store_code, channel
					 FROM global.store_attributes_filter ' || _query_sa || ') saf 
  			    on saf.store_code = pmps.store_code and saf.channel = paf.channel
 				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
  			)
  --			select * from product_master_filters_data
  			,
  			constraint_data AS (
  			    SELECT 
  				   pmps.product_code,
  					size,
					style,
              			color,
 						color_code,
					style_description,
  				   pmps.channel,
  					pmps.article,
  					pmps.l0_name,
 					"offset",
  					pmps.l1_name,
  					pmps.l2_name,
					pmps.clearance_start_date,
  					pmps.launch_date,
  					pmps.retirement_date,
					pmps.selldown_date,
					pmps.clearance_end_date

 -- 			    FROM (select mapping_code, product_code, store_code from inventory_smart.constraint_master where channel = ''' || _channel || ''') c
  			    from inventory_smart.constraint_master c 
				join product_master_filters_data pmps using(mapping_code, l0_name)
 				where  c.channel = ''' || _channel || ''' 
				and c.l0_name in (select distinct l0_name from product_master_filters_data)
				and c.mapping_code is not null
  			    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 ,16,17
  			),
 			final_result AS (
 			  select
 			  	%2$s as limit,
 				ROW_NUMBER () OVER () as sub_offset,
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
 			  		LIMIT %4$s OFFSET %3$s
 			)
 			select 
 			  %5$s 
 			from 
 			  final_result_with_offset';
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
 		RETURN $1;
 	end
 $function$
;