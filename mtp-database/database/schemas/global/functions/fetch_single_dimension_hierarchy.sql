--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:fetch_single_dimension_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:uam_fetch_hierachy
--comment: fetch hierarchy for codes list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_single_dimension_hierarchy(input character varying[], text);
CREATE OR REPLACE FUNCTION global.fetch_single_dimension_hierarchy(input character varying[], text)
 RETURNS TABLE(attributes jsonb)
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.fetch_single_dimension_hierarchy
 * Created by: Akshay Jain
 * Created at: 30-Jun-2023
 * No of input parameter: 2
 * Parameter Description : $1 = list of codes, $2 = name of dimension
 *
 * Purpose: This function been created to get the list of product/store hierarchy data
 * Calling Statement:
 *  select * from global.fetch_single_dimension_hierarchy('{"190276166446",”190276166447'}', 'product')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
   Akshay Jain	30-Jun-2023	    First version
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_hierarchy_columns jsonb;
	_hierarchy_column_str text;
	_key text;
	_product_attribute_json_build_column_for_filter text[]:= array[]::text[];
	
begin
	select * from global.fetch_hierarchy_info_for_client() into _hierarchy_columns;
	if $2 = 'product'::text then	
	
		SELECT string_agg(value::text, ',') AS comma_separated_values
			FROM (
	  		SELECT jsonb_array_elements_text(_hierarchy_columns->'product') AS value
				) AS subquery  into _hierarchy_column_str;

		FOR _key IN SELECT * FROM jsonb_array_elements(_hierarchy_columns->'product')
		  loop
			 _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||replace(_key::text, '"', '')||''''),'X.'|| _key ||'');
			_product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, '''usecase_code'''),'X.'|| 'product_code' ||'');
		    
			END LOOP;
	
		_query_combine := 'select jsonb_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||') from ( select product_code, ' || _hierarchy_column_str || ' from global.product_attributes_filter where product_code =any('''||concat($1)||''')) X ';
	
	
	elseif $2 = 'store'::text then
		SELECT string_agg(value::text, ',') AS comma_separated_values
			FROM (
	  		SELECT jsonb_array_elements_text(_hierarchy_columns->'store') AS value
				) AS subquery  into _hierarchy_column_str;

		FOR _key IN SELECT * FROM jsonb_array_elements(_hierarchy_columns->'store')
		  loop
			 _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||replace(_key::text, '"', '')||''''),'X.'|| _key ||'');
		    _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, '''usecase_code'''),'X.'|| 'store_code' ||'');
			END LOOP;
	
		_query_combine := 'select jsonb_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||') from ( select store_code, ' || _hierarchy_column_str || ' from global.store_attributes_filter where store_code =any('''||concat($1)||''')) X ';


	elseif $2 = 'aggregation'::text then
		SELECT string_agg(value::text, ',') AS comma_separated_values
			FROM (
	  		SELECT jsonb_array_elements_text(_hierarchy_columns->'product') AS value
				) AS subquery  into _hierarchy_column_str;

		FOR _key IN SELECT * FROM jsonb_array_elements(_hierarchy_columns->'product')
		  loop
			 _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||replace(_key::text, '"', '')||''''),'X.'|| _key ||'');
		    _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, '''usecase_code'''),'X.'|| 'aggregation_code' ||'');
			END LOOP;
	
		_query_combine := 'select jsonb_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||') from ( select aggregation_code, ' || _hierarchy_column_str || ' from global.aggregation_level_filter where aggregation_code =any('''||concat($1)||''')) X ';
		
	end if;
        raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;

