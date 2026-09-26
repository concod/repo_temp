--liquibase formatted sql
--changeset liquibase:konakandla.sujan@impactanalytics.co_V2 runOnChange:true stripComments:false splitStatements:false context: MTP-37083 labels:MTP-34240,MTP-112271,MTP-110375,MTP-110375
--comment: MTP-34240 Brand column added, MTP-37083 added supersede column,MTP-112271,MTP-110375,MTP-110375
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_iarecommend_list(input refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_iarecommend_list(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: global.product_profile_iarecommend_list
  * Created by: Kailash Yadav
  * Created at: 21-June-2022
  * No of input parameter: 3
  * Parameter Description : 
  * 						   $1 = Refcusrsor name 	
  * 						   $2 = Json Product master filter
  *                         $3 = JSON for product attribute filter
  * 						   $4 = filter and meta search
  * Purpose: This function been created to get the list of product rules for given product filter
  * Calling Statement:
 		  select * from inventory_smart.product_profile_iarecommend_list
 			('{"article": [], "style_description": [], "style": [], "color_code": [], "l0_name": [], "l1_name": [], "l2_name": []}', '{"channel":["Full Line Retail"]}',
 		 	'{"search": [], "sort": [], "range": [], "limit": {"page": 1, "limit": 10}}');
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
 	declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_sa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	_jsonb_ph jsonb;
 	_query_ph text;
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
 		_cache_table_id text;
 		_cache_schema text := 'inventory_smart';
 		_cache_sp text := '.product_profile_iarecommend_list';
 		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 		_cache_dependencies text[] := '{global.store_attributes, inventory_smart.product_profile_master, inventory_smart.ph_master}';
 
 	begin
 		_query_ph := 'select jsonb '''||$2::text||'''||''{"product_codes":[]}''';
 		--raise notice '_query_ph%',_query_ph;
 		execute _query_ph into _jsonb_ph;
  		_query_pa := 'SELECT *, unnest(product_codes) product_code FROM "inventory_smart".ph_master' || (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph)) || ' AND article_status_tag != ''Old'' ';
  		--_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
         _query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'channel', $3);
  		_query_table_filters := "global".form_table_query($4);
  		raise notice '_query_pa% ',_query_pa;
  		raise notice '_query_sa% ',_query_sa;
 
  		_query_combine :=
             	'
				with y as (select ph_code from inventory_smart.product_profile_master where special_classification = ''ia-clone'' and is_deleted = false)

				select '||$5||' pp_code, article,l0_name,l1_name,l2_name, brand, channel,supersede_flag,similar_mapping::varchar,ph_code,CASE WHEN EXISTS (SELECT 1 FROM y WHERE y.ph_code = x.ph_code) THEN TRUE ELSE FALSE END AS is_clone_created
 			from
                 (select
 					'||$5||'
                     ppm.pp_code, 
 					pa.l0_name,
 					pa.l1_name,
 					pa.l2_name,
 					pa.channel,
 					pa.article,
					pa.brand,
					pa.supersede_flag,
 					''-'' as "similar_mapping",
					ppm.ph_code
 			    from (' || _query_pa || ') pa
 				join inventory_smart.product_profile_master ppm
                      on ppm.ph_code  = pa.ph_code
				where pa.channel in ( SELECT channel from (' || _query_sa || ') as tbl ) 
 					 and not is_deleted and special_classification = ''ia-recommended''
 				group by  '||$5||' ppm.pp_code,article,pa.l0_name,l1_name,l2_name, similar_mapping, pa.channel, pa.brand, supersede_flag,ppm.ph_code ) x
                 ' 
               	;
 
  		raise notice '%',_query_combine;
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
 		--_query_table_filters := global.form_table_query($4);
 		perform set_config(
 		  'myvars.cache_table_id', _cache_table_id, 
 		  true
 		);
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 --		open $1 for execute 'select * from inventory_smart.raise_notice order by t desc';
 		RETURN $1;
 
 	--RETURN QUERY execute _query_combine;
 	end
 $function$
;