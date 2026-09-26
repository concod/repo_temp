--liquibase formatted sql
--changeset harshit.bole@impactanalytics.co:product_rule_filter_sg_mapping stripComments:false splitStatements:false runOnChange:true context:_sub_offset Release labels:QUERY_CHANGES 
--comment Query changes synced with dev for product rule filter sg maping
DROP FUNCTION IF EXISTS inventory_smart.product_rule_filter_sg_mapping(input refcursor, jsonb, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_filter_sg_mapping(input refcursor, jsonb, jsonb, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text := '';
    _query_ph text := '';
    _query_sa text := '';
   _query_l0_name text := '';
   _channel_where_condition text := '';
   _channel text[] := inventory_smart.get_channel_from_input_new($3);
   _application_code int4 := $4;
  _query_sg text := '';
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
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
  
  
begin
	select $2->>'l0_name' into _query_l0_name;
	_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);
	-- raise notice 'l0 query%',_query_l0_name; 
    _query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
   
   
   	SELECT * FROM inventory_smart.form_search_sort_clause($5, '', '') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice ' rrrrr % % % % %', _limit, _offset, _sub_limit, _sub_offset, _ph_sort;
	
	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		
    _query_sg :=  'where TRUE ' || _overall_search || ' LIMIT %2$s OFFSET %1$s';
 
    if cardinality(_channel) = 0 then
		raise notice 'no channel passs %,',$3;
		_channel_where_condition = ' where application_code = ' || _application_code || ' and is_deleted=false ';
	else
		_channel_where_condition := ' where channel in (''' || array_to_string(_channel, ''',''', '') || ''')  and application_code = ' || _application_code || ' and is_deleted=false ';

	end if;

   
   _query_combine_count_format := 'SELECT count(*) FROM (select * from "global".store_groups ' || _channel_where_condition || ') sq;';
   
   
   _query_combine_format := '
	with available_store_groups_wo as (
		select 
			*
		from 
			(select sg.sg_code, sg."name" as sg_name from "global".store_groups sg ' || _channel_where_condition || ') sg
		'|| _query_sg ||'
	)
	, available_store_groups as(
		SELECT *, %1$s as "offset"
		FROM available_store_groups_wo
	)
	,product_store_mapping as (
		select sg_code, sg_name, "offset" from available_store_groups
		join "global".store_groups_mapping sgm using (sg_code)
		join (select store_code, is_deleted from "global".store_attributes_filter '|| _query_sa || ') saf using (store_code)
		join (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||') pmps using (store_code)
		join (select l0_name, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || ') ph
		on pmps.l0_name = ph.l0_name and pmps.product_code = ph.product_code
		group by 1,2,3
	)
	,store_group_with_all_store_codes as (
			select 
				asg.sg_code,
				asg.sg_name,
				saf2.retail_facility_code,
				saf2.store_name,
				"offset"
			from 
				product_store_mapping asg
			join "global".store_groups_mapping sgm2 on asg.sg_code = sgm2.sg_code
			join "global".store_attributes_filter saf2 on sgm2.store_code = saf2.store_code
			where saf2.active
			group by 1,2,3,4,5
			order by 1,2,3
		)
		,store_group_data as (
			select sg_code, sg_name, "offset",
			json_agg(json_build_object(''retail_facility_code'', retail_facility_code, ''store_name'', store_name)) as store_details
			from store_group_with_all_store_codes asg
			group by 1,2,3
			
		)
		,final_result AS (
		  select
		  	%2$s as limit,
			ROW_NUMBER () OVER () as sub_offset,
		    c.*
		  from 
		    store_group_data c  
		)
		,final_result_with_offset AS (
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
		 
		raise notice 'query %', _query_combine_format;

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
--				exit;
--				move ABSOLUTE 0 in $1;
			IF _batch_count = 0 THEN
				_query_combine_count = format(_query_combine_count_format, _offset,_limit);
				raise notice ' %', _query_combine_count;
				EXECUTE _query_combine_count INTO _count;
				perform  global.sp_log(v_gen_random_uuid,'inventory_smart.product_rule_filter_sg_mapping', 'Inside If',_query_combine_count,jsonb_build_object('$2', $2, '$3', $3, '$4', $4, '$5', $5));
				raise notice ' count %', _count;
			END IF;
			BEGIN
				_offset := _offset + _limit;
				_limit := _limit + _limit;
				_sub_offset := 0;
			EXCEPTION
        		WHEN numeric_value_out_of_range then
        		RETURN $1;
        	END;
			raise notice 'tttt % %', _count,_batch_count;
			IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
		END LOOP;
    raise notice '%',_query_combine;
	perform  global.sp_log(v_gen_random_uuid,'inventory_smart.product_rule_filter_sg_mapping', 'Before return',_query_combine,jsonb_build_object('$2', $2, '$3', $3, '$4', $4, '$5', $5));
    RETURN $1;
END;
$function$
;
