--liquibase formatted sql
--changeset liquibase:product_groups_products_list_by_pseudo_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_groups_products_list_by_pseudo_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_products_list_by_pseudo_code(input jsonb, jsonb, jsonb, text, integer[]);
CREATE OR REPLACE FUNCTION global.product_groups_products_list_by_pseudo_code(input jsonb, jsonb, jsonb, text, integer[])
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, attributes jsonb)
 LANGUAGE plpgsql
AS $function$
 	declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	n varchar;
 	a varchar;
 	p text;
 	attr jsonb := '{}';
 	_query_pa_patch text := '';
 	_product_attribute_json_build_column text[] := array['''product_code''', 'X.product_code']::text[];
  	_key text;
  	_value text;
 begin
 	-- create query from product definition sub rule.
 	_query_pa_patch := global.get_query_product_fetch_using_definition_rule($4, $5);
 	_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
 	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 		continue when _key = 'group';
 		_product_attribute_json_build_column := array_append(array_append(_product_attribute_json_build_column, ''''||_key||''''),'X.'|| _key ||'');
 	end loop;
 	_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
 	_query_table_filters := global.form_table_query($3);
 	_query_combine := '
 				select
 					X.product_code,
 					X.product_name,
 					X.product_description,
 					jsonb_build_object(' || array_to_string(_product_attribute_json_build_column, ' ,') ||') as attributes
 				from
 					(
 					select
 							pm.*
 					from
 						(
 						select
 							  main.product_name,
 							  main.product_description,
 							  attributes.*
 						from
 							(' || _query_pm || ') main
 						join (' || _query_pa || ') attributes
 							on
 							  main.product_code = attributes.product_code ) pm
 					join (' || _query_pa_patch || ') patch
 						  on
 							pm.product_code = patch.product_code
 				) X ' || _query_table_filters;
 	-- raise notice '%',_query_combine;
 	return query execute _query_combine;
 end $function$
;
