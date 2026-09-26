--liquibase formatted sql
--changeset liquibase:product_profile_userdefined_list_generic runOnChange:true stripComments:false splitStatements:false context:MTP-106364 labels:MTP-106364
--comment: MTP-106364: Generic implementation for product_profile_userdefined_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_userdefined_list(refcursor, jsonb, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.product_profile_userdefined_list(refcursor, jsonb, jsonb, jsonb, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_userdefined_list(input refcursor, jsonb, jsonb, jsonb, jsonb, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  	declare
  	_query_pm text := '';
  	_query_pa text := '';
  	_query_sa text := '';
  	_query_ppa text := '';
  	_query_table_filters text := '';
  	_query_combine text := '';
  	_jsonb_ph jsonb;
  	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3,'product_profile_attributes', $4);
 	_cache_table_id text;
 	_cache_schema text := 'inventory_smart';
 	_cache_sp text := '.product_profile_userdefined_list';
 	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 	_cache_dependencies text[] := '{inventory_smart.product_profile_master}';
   	_ppaf_req_col text;
   	_paf_req_col text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
  	begin
  		select $2::jsonb || $3::jsonb into _jsonb_ph;
  	
         _query_pa := inventory_smart.product_profile_attribute_table_filters(_jsonb_ph);
   		_query_ppa :=  inventory_smart.form_attribute_table_filters('product_profile_attributes', 'pp_code', $4);
   		raise notice ' query pa %', _query_ppa;

		select regexp_replace($7,',', ',ppaf.', 'g') into _ppaf_req_col;
		raise notice ' ppaf req cols %', _ppaf_req_col;

		-- Standard product attributes for ppa columns
		SELECT regexp_replace($6,',', ',ppa.', 'g') into _paf_req_col;
		raise notice ' ppa req cols %', _paf_req_col;

   		_query_combine := '
 			select distinct '||_ppaf_req_col||', ppaf.channel, ppm.pp_code, ppm.name, ppm.description,ppm.created_at, ppm.created_by, ppm.updated_at,um.user_name, ppa.'||_paf_req_col||'
 			from inventory_smart.product_profile_master ppm  
 			join inventory_smart.product_profile_attributes_filter ppaf using (pp_code) 
 			join ('||  _query_ppa || ') ppa  using (pp_code)
 			left join global.user_master um on ppm.created_by= um.user_code
 			where '||_query_pa||'
 			and not ppm.is_deleted 
 		  	and ppm.special_classification=''user-defined''';

		raise notice 'query combine %',_query_combine;
  	 
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
  		_query_table_filters := global.form_table_query($5);
  		
  	perform set_config(
  		  'myvars.cache_table_id', _cache_table_id, 
  		  true
  		);
  	  			
  		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;	

		-- Standardized logging for all clients
		perform global.sp_log(v_gen_random_uuid, 'inventory_smart.product_profile_userdefined_list', 'Before returning output by function','SELECT * FROM "cache"."'||_cache_table_id||'" X '||_query_table_filters , jsonb_build_object(
        'product_attributes', $2,
		'store_attributes', $3,
		'product_profile_attributes', $4,
        'table_filters', $5,
        'ppa_columns', $6,
        'ppaf_columns', $7
        ));
         RETURN $1;
  	end $function$
;
