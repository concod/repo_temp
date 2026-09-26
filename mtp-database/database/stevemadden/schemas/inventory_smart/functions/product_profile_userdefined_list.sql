--liquibase formatted sql
--changeset liquibase:product_profile_userdefined_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_userdefined_list
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.product_profile_userdefined_list(refcursor, jsonb, jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.product_profile_userdefined_list(input refcursor, jsonb, jsonb, jsonb, jsonb, text)
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
  	begin
  		select $2::jsonb || $3::jsonb into _jsonb_ph;
  	
         _query_pa := inventory_smart.product_profile_attribute_table_filters(_jsonb_ph);
   		_query_ppa :=  inventory_smart.form_attribute_table_filters('product_profile_attributes', 'pp_code', $4);
   		raise notice ' query pa %', _query_ppa;
   		select (SELECT 'ppaf.' || string_agg(TRIM(BOTH '"' from js::text), ',ppaf.') FROM jsonb_array_elements(t.attribute_value->'value') js) AS sa into _ppaf_req_col
 		FROM  "global".tenant_attribute_master t WHERE name = 'product_profile_additional_attributes';
 		SELECT regexp_replace($6,',', ',ppa.', 'g') into _paf_req_col;
 		raise notice ' req cols %', _paf_req_col;
   		
   		_query_combine := '
 			select distinct '||_ppaf_req_col||', ppaf.channel, ppaf.article, ppaf.l1_name, ppaf.l2_name, ppaf.style_name,ppm.pp_code, ppm.name, ppm.description,ppm.created_at, ppm.created_by, ppm.updated_at,um.user_name, ppa.'||_paf_req_col||'
 			from inventory_smart.product_profile_master ppm  
 			join inventory_smart.product_profile_attributes_filter ppaf using (pp_code) 
 			join ('||  _query_ppa || ') ppa  using (pp_code)
 			left join global.user_master um on ppm.created_by= um.user_code
 			where '||_query_pa||'
 			and not ppm.is_deleted 
 		  	and ppm.special_classification=''user-defined''';
  		 
   		raise notice 'query comiine %',_query_combine;
  	 
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
         RETURN $1;
  	end $function$
;
