--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:product_groups_products_list_only_mapped runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22685
--comment: updated sp to handle list of product group codes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_products_list_only_mapped(input jsonb, jsonb, jsonb, integer);
DROP FUNCTION IF EXISTS global.product_groups_products_list_only_mapped(input jsonb, jsonb, jsonb, integer[]);
CREATE OR REPLACE FUNCTION global.product_groups_products_list_only_mapped(input jsonb, jsonb, jsonb, integer[])
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, attributes json, is_mapped boolean)
 LANGUAGE plpgsql
AS $function$
    	declare
    	_query_pm text := '';
    	_query_pa text := '';
    	_query_table_filters text := '';
    	_query_combine text := '';
    	_product_attribute_json_build_column text[] := array[]::text[];
     	_key text;
     	_value text;
    	begin
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
    					json_build_object(' || array_to_string(_product_attribute_json_build_column, ' ,') ||') as attributes,
    					X.is_mapped	
    				from
    					(
    					select
    								pm.*,
    								(case
    							when pgm.product_code is null then false
    							else true
    						end) as is_mapped
    					from
    								(
    						select
    							main.product_name,
    							main.product_description,
    							attributes.*
    						from
    							(' || _query_pm || ') main
    						join (' || _query_pa || ') attributes on
    							main.product_code = attributes.product_code) pm
    					 join (
    						select
    							distinct product_code
    						from
    							"global".product_groups_mapping
    						where
    							pg_code = any(''' || concat($4) || '''::int[])) pgm on
    							pm.product_code = pgm.product_code
    			) X ' || _query_table_filters;
    		raise notice '%',_query_combine;
    		return query execute _query_combine;
    	end $function$
;

