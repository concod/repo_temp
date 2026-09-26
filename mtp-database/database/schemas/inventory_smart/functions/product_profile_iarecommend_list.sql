--liquibase formatted sql
--changeset adesh.kumar@impactanalytics.co:product_profile_iarecommend_list_generic_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-generic labels:generic
--comment: MTP-106364:generic-implementation-non-inclusion-channel-filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_iarecommend_list(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_iarecommend_list(
    input refcursor, 
    product_attributes jsonb, 
    store_attributes jsonb, 
    table_filters jsonb, 
    additional_columns text DEFAULT '',
    client_config jsonb DEFAULT '{"include_channel": true, "channel_filter": null}'::jsonb
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.product_profile_iarecommend_list
  * Created by: Adesh Kumar
  * Created at: 2025-09-15
  * Purpose: Generic function to get the list of product profile for given product filter
  * 
  * Client Config Options:
  *   - include_channel: boolean (default: true) - Whether to include channel column
  *   - channel_filter: string (optional) - Hardcoded channel filter value
  */
 	declare
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	_jsonb_ph jsonb;
 	_query_ph text;
 	v_gen_random_uuid text := gen_random_uuid()::varchar;
 	
 	-- Extract config values
 	_include_channel boolean := COALESCE(($6->>'include_channel')::boolean, true);
 	_channel_filter text := $6->>'channel_filter';
 	
 	-- Build column lists
 	-- Fixed column building logic
	_ph_columns text := 'ph_code' || 
	case when $5 != '' then ', ' || $5 else '' end || 
	case when _include_channel then ', channel' else '' end;

	_select_columns text :=
    case when $5 != '' then 
        $5 || case when _include_channel then ', channel' else '' end || ', pp_code'
    else 
        case when _include_channel then 'channel, pp_code' else 'pp_code' end
    end;

 	_group_columns text := 
    case when $5 != '' then 
        $5 || case when _include_channel then ', channel' else '' end || ', ppm.pp_code'
    else 
        case when _include_channel then 'channel, ppm.pp_code' else 'ppm.pp_code' end
    end;
 	_channel_filter_condition text := case when _channel_filter is not null then ' and pa.channel in (''' || _channel_filter || ''')' else '' end;
 	
 	-- Cache variables
 	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
 	_cache_table_id text;
 	_cache_schema text := 'inventory_smart';
 	_cache_sp text := '.product_profile_iarecommend_list';
 	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 	_cache_dependencies text[] := '{global.store_attributes, inventory_smart.product_profile_master, inventory_smart.ph_master}';

 	begin
 		-- Build ph_master query
 		_query_ph := 'select jsonb '''||$2::text||'''||''{"product_codes":[]}''';
 		execute _query_ph into _jsonb_ph;
 		
 		_query_pa := 'SELECT '||_ph_columns||' FROM "inventory_smart".ph_master' || (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph));
 		_query_table_filters := "global".form_table_query($4);
 
 		-- Build main query
 		_query_combine := format('
 			select %s
 			from (
 				select %s
 				from (%s) pa
 				join inventory_smart.product_profile_master ppm on ppm.ph_code = pa.ph_code
 				where not ppm.is_deleted%s
 				group by %s
 			) x', 
 			_select_columns, _select_columns, _query_pa, _channel_filter_condition, _group_columns
 		);
 		
 		-- Logging
 		raise notice 'Query PA: %', _query_pa;
 		raise notice 'Query Combine: %', _query_combine;
 		
 		-- Execute cache wrapper
 		select
 		  * 
 		from 
 		  cache.wrap_sp(
 			_cache_schema, 
 			_cache_sp, 
 			_cache_payload, 
 			_query_combine, 
 			_cache_dependencies, 
 			_cache_key_pattern
 		  ) into _cache_table_id;
 		
 		perform set_config(
 		  'myvars.cache_table_id', _cache_table_id, 
 		  true
 		);
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		perform global.sp_log(v_gen_random_uuid, 'inventory_smart.product_profile_iarecommend_list', 'Before returning output by function','SELECT * FROM "cache"."'||_cache_table_id||'" X '||_query_table_filters , jsonb_build_object(
 			'JSON for Product master filter', $2, 'JSON for product attribute filter', $3, 'filter and meta search',$4, 'additional_columns', $5, 'client_config', $6
 		));
 		RETURN $1;
 	end
 $function$
;
