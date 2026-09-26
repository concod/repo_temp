--liquibase formatted sql
--changeset liquibase:konakandla.sujan@impactanalytics.co_v5 runOnChange:true stripComments:false splitStatements:false context: MTP-110375 labels:MTP-110375,MTP-110375,small fix,add cache,fix
--comment: add new sp,remove cache,small fix,add cache,MTP-110375,fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_ia_clone_list(input refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_ia_clone_list(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: global.product_profile_ia_clone_list
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
 		  select * from 
            inventory_smart.product_profile_ia_clone_list
            ('fa69e1f0-7c22-4c95-975e-40f47643ee0a',
            '{"article": [], "l0_name": [{"operator": "in", "type": "list", "values": ["33-MENS APPAREL", "44-WOMENS APPAREL", "51-ACCESSORIES AND FRAGRANCE", "61-CHILDRENS", "70-HOME", "81-INNOVATION", "82-ANTIQUES AND VINTAGE", "85-FINE JEWELRY AND WATCHES", "92-CONCESSION BUSINESSES", "94-GENERIC", "97-CREATIVE SERVICES"]}], "l1_name": [{"operator": "in", "type": "list", "values": ["33-M CLOTHING", "34-M FURNISHINGS", "35-M SPORTSWEAR", "36-M ACCESSORIES", "44-W APPAREL", "46-W ACCESSORIES", "51-FRAGRANCE __ia_char_13 COSMETICS", "61-BABY", "62-BOYS", "63-GIRLS", "70-HOME CASH AND CARRY", "72-HOME SPECIAL ORDER", "81-INNOVATION", "82-ANTIQUES", "84-VINTAGE", "85-FINE JEWELRY", "86-FINE WATCHES", "94-GENERIC", "96-CONSIGNMENT", "97-SERVICES"]}], "l2_name": [], "style": [], "color": [], "product_description": [], "style_color_id": [], "l3_name": [], "l4_name": [], "model_description": []}',
            '{"channel": [{"operator": "in", "type": "list", "values": ["PFS"]}]}',
            '{"search": [], "sort": [{"column": "created_at", "order": "desc"}], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}',
            'style,color,product_description,style_color_id,l3_name,l4_name,model_description,')
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
 		_cache_sp text := '.product_profile_ia_clone_list';
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
		raise notice '_query_table_filters%',_query_table_filters;

 
  		_query_combine :=
             	'select '||$5||' pp_code, article,l0_name,l1_name,l2_name, brand, channel,supersede_flag,similar_mapping::varchar,ph_code,created_at,user_name
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
					ppm.ph_code,
                    ppm.created_at,
					um.user_name
 			    from (' || _query_pa || ') pa
 				join inventory_smart.product_profile_master ppm
                      on ppm.ph_code  = pa.ph_code
				left join global.user_master um on um.user_code = ppm.created_by 
				where pa.channel in ( SELECT channel from (' || _query_sa || ') as tbl ) 
 					 and not ppm.is_deleted and special_classification = ''ia-clone''
 				group by  '||$5||' ppm.pp_code,article,pa.l0_name,l1_name,l2_name, similar_mapping, pa.channel, pa.brand, supersede_flag,ppm.ph_code,um.user_name ) x 
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