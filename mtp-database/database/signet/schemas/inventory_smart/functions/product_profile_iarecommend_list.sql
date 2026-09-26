--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:product_profile_iarecommend_list_optimised runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: optimised changeset for product_profile_iarecommend_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_iarecommend_list(input refcursor, jsonb, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.product_profile_iarecommend_list(refcursor, jsonb, jsonb, jsonb, text, jsonb);
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
  		--_query_pa := 'SELECT *, unnest(product_codes) product_code FROM "inventory_smart".ph_master' || (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph));

		_query_pa := 'SELECT ph.*, pc.product_code
		FROM inventory_smart.ph_master ph
		CROSS JOIN LATERAL unnest(ph.product_codes) AS pc(product_code)' 
		|| (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph));
		
  		--_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
         _query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  		_query_table_filters := "global".form_table_query($4);
  		raise notice '%',_query_pa;

  		-- _query_combine :=
        --      	'select '||$5||' pp_code, article,l0_name,l1_name,l2_name,channel,similar_mapping::varchar
 		-- 	from
        --          (select
 		-- 			'||$5||'
        --              ppm.pp_code, 
 		-- 			pa.l0_name,
 		-- 			pa.l1_name,
 		-- 			pa.l2_name,
 		-- 			sa.channel,
 		-- 			pa.article,
 		-- 			''-'' as "similar_mapping"
 		-- 	    from (' || _query_pa || ') pa
        --          join "global".product_mapping_product_store pmps
        --              on pmps.product_code = pa.product_code
		-- 			 and pmps.l0_name = pa.l0_name
        --          join (' || _query_sa || ') sa
        --              on sa.store_code  =pmps.store_code
 		-- 			and pa.channel = sa.channel
 		-- 		join inventory_smart.product_profile_master ppm
        --               on ppm.ph_code  = pa.ph_code
 		-- 			 and not is_deleted 
 		-- 		group by  '||$5||' ppm.pp_code,article,pa.l0_name,l1_name,l2_name, similar_mapping, sa.channel ) x
        --          ' 
        --        	;

		_query_combine :=
			'WITH pa AS (' || _query_pa || '),
			sa AS (' || _query_sa || ')
			SELECT DISTINCT '||$5||'
				ppm.pp_code,
				pa.l0_name,
 		 		pa.l1_name,
 		 		pa.l2_name,
				sa.channel,
				pa.article,
				''-'' AS similar_mapping
			FROM pa
			JOIN sa
				ON sa.channel = pa.channel
			JOIN global.product_mapping_product_store pmps
				ON pmps.l0_name = pa.l0_name
				AND pmps.product_code = pa.product_code
				AND pmps.store_code = sa.store_code
			JOIN inventory_smart.product_profile_master ppm
				ON ppm.ph_code = pa.ph_code
				AND NOT ppm.is_deleted
			';
 
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