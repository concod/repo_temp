--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:product_store_mapping_ref_store_products_list_feature_22219_bugfix runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:product_store_mapping_ref_store_products_list_feature_22219_bugfix
--comment: fixed bug in product_store_mapping_ref_store_products_list_feature_22219
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_ref_store_products_list(input refcursor, text[], jsonb, jsonb, jsonb, text, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_store_mapping_ref_store_products_list(input refcursor, text[], jsonb, jsonb, jsonb, text, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
 	_store_codes_len int := array_length($2, 1);
 	_projection_cols text[] := array['product_name', 'product_description']::text[];
 	_key text;
 	_value text;
 	_final_query text;
 	_query_mapping_table text:= '';
 	json_array jsonb;
 	begin
 		_query_pm := 'SELECT product_code FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
  		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
  		
  	
  		SELECT jsonb_build_object(
		    'store_code',
		    jsonb_build_array(
		        jsonb_build_object(
		            'type', 'list',
		            'operator', 'in',
		            'values', jsonb_agg(arr)
		        )
		    )
		) into json_array
		FROM unnest($2::text[]::text[]) AS arr;
		
		$7 := $7 || json_array;
	
		_query_mapping_table := 'SELECT product_code, store_code, validity FROM "global".product_mapping_product_store' || ("global".form_main_table_filters('product_mapping_product_store', $7));
	
		
  		for _key, _value in select * from jsonb_each_text($4) loop
 	 		_projection_cols := array_append(_projection_cols, _key);
  		end loop;
 		
 		_query_table_filters := "global".form_table_query($5);
 	_query_combine := 'with ref_store_cte as (
 				select
  					product_code
  				from
  					"global".product_store_mapping
  				where
  					store_code = ''' || $6 || ''' and validity is not null ),
 				main_cte as (
 
 				SELECT main.product_code FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code
 
 				),
 				ref_store_to_product_cte as (
 								select ref_store_cte.product_code, temp1.store_code, temp1.validity  from (' || _query_mapping_table || ') temp1 right join ref_store_cte on ref_store_cte.product_code = temp1.product_code
 										),
 				final_cte as (
 
 				select rstp.product_code, rstp.store_code, rstp.validity from ref_store_to_product_cte rstp join main_cte mc on rstp.product_code = mc.product_code
 			
 			   )select *  from (SELECT
 					 X.product_code, 
 					 X.is_mapped, 
 			         X.num_stores_mapped, 
 					 X.mapped_stores,
 					' || array_to_string(_projection_cols, ', ', '') || ' FROM (
 							select 
 								product_code,
 							case
 								when count(validity) > 0 then true
 								else false
 							end as is_mapped,
 							concat(count(validity), ''/'', ' || _store_codes_len || ') as num_stores_mapped,
 							array_agg(store_code) FILTER (WHERE validity is not null) as mapped_stores
 							from final_cte 
 							group by product_code ) X join global.product_attributes_filter paf
 					on X.product_code = paf.product_code ) Y ' || _query_table_filters;
 	raise notice '%', _query_combine;
 
 	if $8 is true then
 		_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
 	else
 		_final_query := _query_combine;
 	end if;
 	OPEN $1 FOR execute _final_query;
 	RETURN _query_combine;
  	end
 $function$
;
