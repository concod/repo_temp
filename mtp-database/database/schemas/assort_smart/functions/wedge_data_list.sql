--liquibase formatted sql
--changeset hemant:image-wedge-fetch-sp runOnChange:true stripComments:false splitStatements:false context:MTP-27475 labels:liquibase_project_start
--comment: added few cols
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.wedge_data_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION assort_smart.wedge_data_list(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: assort_smart.wedge_data_list
  * Created by: Sadhana J
  * Created at: 17-Feb-2023
  * No of input parameter: 3
  * Parameter Description : $1 = Ref cursor
  *                         $2 = filter
  * 						   $3 = table query

  * Purpose: to fetch wedge data n store into db-cache first time, next get data from db-cache
  * Calling Statement:
            DECLARE
                'my_cur'::refcursor;

            commit;
                begin;
                select * from assort_smart.wedge_data_list('my_cur',
                '
                {"filters":[{"attribute_name":"plan_code","value":[1901],"operator":"in"},{"attribute_name":"l0_name","value":["Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["Backpacks/Lunch Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Backpacks"],"prefix":"levels","operator":"in"},{"attribute_name":"l3_name","value":["Core"],"prefix":"levels","operator":"in"},{"attribute_name":"wedge_level","value":["style_level"],"prefix":"levels","operator":"in"}],"data_level":"style_level"}
                ',
                '{"search": [], "sort": [{"column": "created_at", "order": "desc"}], "range": [], "limit": {"limit": 10, "page": 1}}'
                );
                fetch all in "my_cur";

                commit;
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  */
 declare
 DECLARE


 	_query_table_filters text := '';
 	_query_combine text;
    _input_json json ;
    _attribute_name text;
    _operator text;
    _prefix text;
    _value text;
    _where text;
    _input_data jsonb;
    _filter_data jsonb;
 	 /*	_cache_table_id text;
 	_cache_schema text := 'assort';
 	_cache_sp text := '.wedge_data_list';
 	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
    _cache_payload jsonb := jsonb_build_object('plan_wedge_opt_master', $2);
    _cache_dependencies text[] := '{assort.plan_wedge_opt_master}';*/

 	begin
 		_where:=null;
        _input_data:= $2::jsonb;
        _filter_data:=(_input_data->>'filters')::jsonb;

       _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );

       _query_combine := 'SELECT plan_wedge_opt_id, parent_wedge_id, plan_code,levels->>''l0_name'' l0_name,
                                         levels->>''l1_name'' l1_name,
										 levels->>''l2_name'' l2_name,
										 levels->>''l3_name'' l3_name,
										 levels->>''channel'' channel,
										 levels->>''cluster_code'' cluster_code,
										 levels->>''cluster_display_name'' cluster_display_name,
										 levels->>''launch'' as launch_name,
										 levels->>''delivery'' as delivery_name,
										 levels->>''wedge_level'' as wedge_level,
										 attribute_value->>''choice_name'' as choice_name,
                                         attribute_value->>''style_id'' as style_id,
                                         attribute_value->>''is_image_mapped'' as is_image_mapped,
										 cast(attribute_value->>''order_of_style'' as float) order_of_style,
										 cast(attribute_value->>''order_of_choice'' as float) order_of_choice,
										 cast(attribute_value->>''channel_qty'' as float) channel_qty,
										 attribute_value::jsonb -''choice_msg'' - ''l4_msg'' attribute_value,
                                         image_name_url
                     FROM assort_smart.plan_wedge_opt_master
                     ' || ' ' ||_where || ' ' ||''
                     ;
        		_query_table_filters := global.form_table_query($3);
        --raise notice '%', _query_combine||_query_table_filters;
        
        --  return QUERY execute _query_combine;
         open $1 for execute _query_combine||_query_table_filters;
 			RETURN $1;

         --raise notice '%', _query_combine;
         -- return QUERY execute _query_combine;
        /*
 		select * from cache.wrap_sp(
 			_cache_schema,
 			_cache_sp,
 			_cache_payload,
 			_query_combine,
 			_cache_dependencies,
 			_cache_key_pattern) into _cache_table_id;
 		-- _query_table_filters := global.form_table_query($4);
 		_query_table_filters := global.form_table_query($3);
 		perform set_config('myvars.cache_table_id', _cache_table_id, true);

 		--raise notice '%', 'select * from "cache"."' || _cache_table_id || '" X ';
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 		RETURN $1;
        */
  	end
    $function$
;
