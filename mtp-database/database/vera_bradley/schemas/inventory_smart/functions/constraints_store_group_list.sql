--liquibase formatted sql
--changeset liquibase:constraints_store_group_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-22991, MTP-22990
--comment: bugfix:MTP-22991, MTP-22990 - fixed record duplicate issue
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
	begin
		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_pa := _query_pa || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
 		
	
		_query_table_filters := global.form_table_query($5);
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
			asg as (SELECT * from inventory_smart.article_store_grade),

			product_master_filters_data as (
	 			SELECT 
	 			  pmps.product_code, 
					pmps.mapping_code,
	 			  channel, 
				  --store_code,
	 			  paf.style_description,
	 			  paf.style,
	 			  paf.color,
				  paf.color_code,
	 			  paf.article_status_tag,
	 			  product->>''size'' as size,
	 			  paf.article, 
					"offset",
	 			  paf.l0_name,
				  paf.l2_name, 
	 			  paf.l1_name,
  				  paf.clearance_start_date,
  				  paf.launch_date,
  				  paf.retirement_date,
				  paf.selldown_date,
				  paf.clearance_end_date

	 			FROM 
	 			  (
	 			    select 
	 			      *,
	 			      unnest(product_code_size_map) as product
	 			    from 
	 			      ph_data
	 			  ) paf 
	 			  join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and pmps.l0_name = paf.l0_name
				  join (
					      select 
					        store_code, 
					        --saf.store_name, 
					        saf.channel
					        --saf.region 
					
					      FROM 
					        global.store_attributes_filter saf 
							
					      	' || _query_sa || '
					    ) saf using(store_code, channel)
	 		)
--			select * from product_master_filters_data
			,constraint_data as (
				select 
				  pmps.product_code, 
	 			  pmps.channel, 
				 --pmps.store_code,
	 			  pmps.style_description,
	 			  pmps.style,
	 			  pmps.color,
				  pmps.color_code,
	 			  pmps.article_status_tag,
	 			  pmps.size,
	 			  pmps.article, 
					"offset",
	 			  pmps.l0_name,
				  pmps.l2_name, 
	 			  pmps.l1_name,
  				  pmps.clearance_start_date,
  				  pmps.launch_date,
  				  pmps.retirement_date,
				  pmps.selldown_date,
				  --a.grade,
				  pmps.clearance_end_date

				FROM inventory_smart.constraint_master c
 			    join product_master_filters_data pmps using(mapping_code,l0_name)
				--left join asg a on a.store_code=pmps.store_code and a.article=pmps.article
				where c.l0_name in (select distinct l0_name from product_master_filters_data)
				and c.mapping_code is not null
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18
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