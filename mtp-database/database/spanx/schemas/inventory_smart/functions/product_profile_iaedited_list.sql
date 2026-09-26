--liquibase formatted sql
--changeset adesh:product_profile_iaedited_list runOnChange:true stripComments:false splitStatements:false context:MTP-68590-modify-meta-param labels:MTP-68590
--comment: MTP-68590-product_profile_iaedited_list-modify-meta-param
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_iaedited_list(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_iaedited_list(input refcursor, jsonb, jsonb, jsonb, text)
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
  	begin
  		select $2::jsonb || $3::jsonb into _jsonb_ph;
  	
         _query_pa := inventory_smart.product_profile_attribute_table_filters(_jsonb_ph);
   		raise notice ' query pa %', _query_ppa;
   		
   		_query_combine := '
			select distinct '||$5||', ppm.pp_code, ppm.name, ppm.description,ppm.created_at, ppm.created_by, ppm.updated_at,um.user_name
 			from inventory_smart.product_profile_master ppm  
 			join inventory_smart.product_profile_attributes_filter ppaf using (pp_code)
 			left join global.user_master um on ppm.created_by= um.user_code
 			where '||_query_pa||'
 			and not ppm.is_deleted 
 		  	and ppm.special_classification=''ia-edited''';
  		 
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
		_query_table_filters := global.form_table_query($4);
  		
  	perform set_config(
  		  'myvars.cache_table_id', _cache_table_id, 
  		  true
  		);			
  		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;	
         RETURN $1;
  	end $function$
;
