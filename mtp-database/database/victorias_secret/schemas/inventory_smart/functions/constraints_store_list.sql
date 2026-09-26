--liquibase formatted sql
--changeset liquibase:constraints_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-24102
--comment: fixed record duplicate issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 		
 Calling statement:		
 				BEGIN;
select * from inventory_smart.constraints_store_list('my_cur'::refcursor, '{
    "l0_name": [{"type":"list","operator":"in","values":["Accessories"]}],
    "l1_name": [],
    "l2_name": [],
    "l3_name": [],
    "l4_name": [],
    "style": [],
    "style_description": [],
    "article": [],
    "color": [],
    "color_code": [],
    "human_readable_color": [],
    "launch_date": [],
    "assortment_indicator": [],
    "factory_type": [],
    "article_status_tag": []
}'::jsonb,
'{"channel":[{"type":"list", "operator": "in", "values":["Factory Line Retail"]}]}'::jsonb,
'{
		"search": [{
                "column": "article",
                "pattern": "10ACBG1002-NEIN"
            },
            {
                "column": "store_name",
                "pattern": "Chicago Premium Outlets"
            }],
		"sort": [],
		"range": [],
		"limit": {
			"page": 1,
			"limit": 10
		}
	}'::jsonb);
FETCH ALL IN "my_cur";
select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
    "sort": [],
    "limit": {
        "limit": 10,
        "page": 1
    }
}');
COMMIT;

 Modified by :kailash Yadav  18-Aug-2022
	 Jira Ticket :https://impactanalytics.atlassian.net/browse/DAT-115
 */


	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_channel_where_condition text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_client_columns text;
		
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
		_test1 int;
		_column_sort text:= '';
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin 		
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_pa := _query_pa || ' and channel = ''' ||replace (_channel,',','')||'''' || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	
--		if length (_overall_search) > 0 then _limit := _limit * 20; end if;
	
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
 					    pmps.store_code,
 						paf.article_status_tag,
 					    paf.l0_name, 
 					    paf.l1_name,
						paf.l2_name,
 						paf.l3_name,
						paf.l4_name,
						paf.product_description,
						paf.style_color_id,
 						product->>''size'' as size,
						product->>''order'' as size_order,
 					    paf.article,
						"offset",
						style,
             			color,
 					    saf.store_name, 
 					    saf.channel,
						saf.retail_facility_code,
						ph_code
					  FROM 
					    (
					      select 
					        *,
							unnest(product_code_size_map) as product
					      FROM 
					        ph_data
					    ) paf 
					    join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name						
					    join (
					      select 
					        *
					      FROM 
					        global.store_attributes_filter saf 
					      	' || _query_sa || ' and special_classification not in (''WHS'')
					    ) saf using(store_code) 
				) -- select * from product_master_filters_data
				, 
				constraint_data AS (
					  SELECT 
						pmps.product_code, 
 					    pmps.store_code,
						pmps.mapping_code,
 						pmps.size,
						pmps.size_order,
 					    pmps.l0_name, 
 					    pmps.l1_name, 
						pmps.l2_name,
 					    pmps.l3_name,
						pmps.l4_name,
 						pmps.article, 
 						pmps.article_status_tag,
 						pmps.style,
                        pmps.color,
 					    pmps.store_name, 
 					    pmps.channel,
						pmps.product_description,
						pmps.style_color_id,
						pmps.retail_facility_code,
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
 					    c.min_stock as min_store, 
 					    c.max_stock as max_store, 
 					    c.min_stock as min_store_sum, 
 					    c.max_stock as max_store_sum, 
 					    c.transit_time as transit_time_sum, 
 					    email AS updated_by, 
 						to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') as updated_at
 	--					coalesce(c.updated_at, c.created_at) as updated_at
					  FROM 
						inventory_smart.constraint_master c 
 					    join product_master_filters_data pmps using(mapping_code)
 					    LEFT JOIN global.user_master um on c.updated_by = um.user_code
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article and asg.ph_code = pmps.ph_code
						where c.l0_name in (select distinct l0_name from product_master_filters_data) and c.channel = ''' || _channel || '''
						and c.mapping_code is not null
						ORDER BY article ASC, size_order ASC, store_code ASC
				),
				final_result AS (
				  select
				  	%2$s as limit,
					ROW_NUMBER () OVER () as sub_offset,
				    c.*,
					(select array_agg(distinct sg.name) from "global".store_groups_mapping sgm
					join "global".store_groups sg on sgm.sg_code = sg.sg_code 
					where sgm.store_code = c.store_code) as sg_names
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
--		raise notice 'loop begnig %', _query_combine_format;
			WHILE _count > 0 AND _batch_count = 0 loop
				raise notice 'llllooopppp % %', _count, _batch_count;
				raise notice ' loop % % % %', _limit, _offset, _sub_offset, _sub_limit;
				_query_combine = format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, '*');	
				raise notice ' %', _query_combine;
				OPEN $1 SCROLL FOR EXECUTE _query_combine ;
				perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.constraints_store_list', '_query_combine',_query_combine,jsonb_build_object('$2', $2, '$3', $3, '$4', $4));
				raise notice 'query executed1';
				
				-- Only way to get the count of items in the cursor`
--				select count(*) from $1 into _test1;
				
--				fetch $1 into _batch_count;
--				raise notice 'query executed11111 %', _batch_count;
--				MOVE FORWARD ALL FROM $1;
--				raise notice 'query executed2';
--				GET DIAGNOSTICS _batch_count := ROW_COUNT;
--				MOVE BACKWARD ALL FROM $1;
--				MOVE ABSOLUTE 0 IN $1;
				execute format(_query_combine_format, _offset, _limit, _sub_offset, _sub_limit, 'count(*)') into _batch_count;
--				
				raise notice ' batch count %', _batch_count;
--				exit;
--				move ABSOLUTE 0 in $1;
				IF _batch_count = 0 THEN
					_query_combine_count = format(_query_combine_count_format, _offset,_limit);
					raise notice ' %', _query_combine_count;
					EXECUTE _query_combine_count INTO _count;
					perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.constraints_store_list', 'Inside IF ',_query_combine_count,jsonb_build_object('$2', $2, '$3', $3, '$4', $4));
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