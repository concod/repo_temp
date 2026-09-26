--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:image-wedge-fetch-sp,add hero_status runOnChange:true stripComments:false splitStatements:false context:MTP-27475, MTP-44204 labels:hero_status,program,subrand
--comment: MTP-24306, MTP-44204- add hero_status, program, sub brand
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.wedge_data_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION assort.wedge_data_list(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: assort.wedge_data_list
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
                select * from assort.wedge_data_list2('my_cur',
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

       _where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );

       _query_combine := 'SELECT plan_wedge_opt_id, parent_wedge_id, plan_code,levels->>''l0_name'' l0_name,
                                                         levels->>''l1_name'' l1_name,
                         levels->>''l2_name'' l2_name,
                         levels->>''l3_name'' l3_name,
                         levels->>''channel'' channel,
                         levels->>''cluster_code'' cluster_code,
                         levels->>''cluster_display_name'' cluster_display_name,
                         levels->>''drop'' as drop_name,
                         levels->>''flow'' as flow_name,
                         attribute_value->>''is_image_mapped'' as is_image_mapped,
                         cast(attribute_value->>''order_of_choice'' as float) order_of_choice,
                         cast(attribute_value->>''channel_qty'' as float) channel_qty,
                         cast(attribute_value->>''total_qty'' as float) total_qty,
                         attribute_value::jsonb -''choice_msg'' - ''l4_msg'' attribute_value,
                         attribute_value->>''hero_status''  hero_status,
                         attribute_value->>''program''  program,
                         attribute_value->>''subbrand''  subbrand,
                         image_name_url
                     FROM assort.plan_wedge_opt_master
                     ' || ' ' ||_where || ' ' ||''
                      --'order by levels->>''l0_name'', levels->>''l1_name'',levels->>''l2_name'',levels->>''l3_name'',
                      --levels->>''cluster_code'',
                      --   SUBSTRING(split_part(attribute_value->>''choice_name'', ''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC,
                      --   attribute_value->>''choice_name'', levels->>''drop'' '
                     ;
		_query_table_filters := global.form_table_query($3);
        --raise notice '%', _query_combine||_query_table_filters;
        
        --  return QUERY execute _query_combine;
         open $1 for execute _query_combine||_query_table_filters;
 			RETURN $1;
/*
 		select * from cache.wrap_sp(
 			_cache_schema,
 			_cache_sp,
 			_cache_payload,
 			_query_combine,
 			_cache_dependencies,
 			_cache_key_pattern) into _cache_table_id;
 		-- _query_table_filters := global.form_table_query($4);
 		
 		perform set_config('myvars.cache_table_id', _cache_table_id, true);

 		--raise notice '%', 'select * from "cache"."' || _cache_table_id || '" X ';
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 		RETURN $1;*/
  	end
    $function$
;
