--liquibase formatted sql
--changeset liquibase:new_store_demand_and_constraint_all runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:MTP-31781
--comment: added OH parameter to output results ros WIll COme from Frontend
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint_all(input refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_demand_and_constraint_all(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
 	declare
 		_query_pa text;
 		_query_sa text;
 		_query_combine text;
 		_query_table_filters text;
 		_client_columns text;
 		_channel text;
 		
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
	 	SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;


 		if length ($5)> 0 then
 			_client_columns := ','||$5;
 		else 
 			_client_columns := '';
 		end if;
 		_channel := inventory_smart.get_channel_from_input($3);
 		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
 		_query_sa :=  global.form_main_table_filters('store_attributes_filter', $3);
 		_query_table_filters := global.form_table_query($4);
 		_query_pa := _query_pa || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
 		_query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || ' ) sq;';
 	
		raise notice ' _query_sa % ', _client_columns;
 		
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
 					    pmps.store_code,
						saf.store_name,
 						paf.style_description,
 					    paf.l0_name, 
 					    paf.l1_name,
						paf.l2_name,
 						product->>''size'' as size,
 					    paf.article,
						paf.article_status_tag,
						"offset",
						paf.pp_code,
 					    saf.channel
					  FROM 
					    (
					      select 
					        pd.*,
					        pp.pp_code, 
							unnest(product_code_size_map) as product
					      FROM 
					        ph_data pd
					    	left join inventory_smart.product_profile_master pp using (ph_code)
					    ) paf 
					    join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name		
						join (
					      select 
					        *
					      FROM 
					        global.store_attributes_filter saf 
					      	' || _query_sa || '
					    ) saf using(store_code)
				) -- select * from product_master_filters_data
				, 
				constraint_data AS (
					  SELECT 
						pmps.product_code, 
 					    pmps.store_code,
 						pmps.size,
 					    pmps.l0_name, 
 					    pmps.l1_name, 
						pmps.l2_name,
 						pmps.article, 
                        pmps.style_description,
 						pmps.article_status_tag,
 					    pmps.store_name, 
 					    pmps.channel,
						pmps.pp_code,
						''IA Recommeded'' as ia_recommended,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = ''AAA'' then 1
 							when asg.grade = ''AA'' then 2
 							when asg.grade = ''A'' then 3
 							when asg.grade = ''B'' then 4
 							when asg.grade = ''C'' then 5
 							when asg.grade = ''D'' then 6
 							else 11
 						end as store_grade_priority,
						"offset",
 					    c.wos, 
 					    c.min_stock, 
 					    c.max_stock, 
 					    c.transit_time as transit_time_sum,
						c.mapping_code,
						c.ros, 
						COALESCE(c.aps,0) aps, 
						c.safety_stock,
						li.oh
					  FROM 
						inventory_smart.constraint_master c 
 					    join product_master_filters_data pmps using(mapping_code, l0_name)
						join inventory_smart.latest_inventory li  on c.product_code = li.product_code and c.store_code = li.store_code
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article
						left join global.product_attributes_filter paf on paf.article = pmps.article
						where c.l0_name in (select distinct l0_name from product_master_filters_data)
						and c.mapping_code is not null 
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
		 
		 raise notice ' _query_combine % ', _query_combine_format;

 			WHILE _count > 0 AND _batch_count = 0 loop
				raise notice 'llllooopppp % %', _count, _batch_count;
				raise notice ' loop % % % %', _limit, _offset, _sub_offset, _sub_limit;
				_query_combine = format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, '*');	
				raise notice ' %', _query_combine;
				OPEN $1 FOR EXECUTE _query_combine ;
				raise notice 'query executed1';
				
				execute format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, 'count(*)') into _batch_count;
--				
				raise notice ' batch count %', _batch_count;
				IF _batch_count = 0 THEN
					_query_combine_count = format(_query_combine_count_format, _offset,_limit);
					raise notice ' %', _query_combine_count;
					EXECUTE _query_combine_count INTO _count;
					raise notice ' count %', _count;
				END IF;
				_offset := _offset + _limit;
				_limit := _limit + _limit;
				raise notice 'tttt % %', _count,_batch_count;
				IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
			END LOOP;
		RETURN $1;
 		end
 	$function$
;
