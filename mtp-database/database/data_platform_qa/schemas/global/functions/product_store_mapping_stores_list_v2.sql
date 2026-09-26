--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:product_store_mapping_stores_list_v2_syntax_issue runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:product_store_mapping_stores_list_v2_syntacx_issue
--comment: fixed syntax issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_stores_list_v2(input jsonb, jsonb, jsonb, jsonb, text[]);
CREATE OR REPLACE FUNCTION global.product_store_mapping_stores_list_v2(input jsonb, jsonb, jsonb, jsonb, text[])
 RETURNS TABLE(store_code character varying, store_name character varying, store_description text, active boolean, attributes json, is_mapped boolean, num_products_mapped text, mapped_products character varying[])
 LANGUAGE plpgsql
AS $function$
   declare
   	_query_sm text := '';
   	_query_sa text := '';
   	_query_table_filters text := '';
   	_query_combine text;
   	_product_codes_len int := array_length($5, 1);
   	_store_attributes_column text[]:= array['sm.store_code']::text[];
   	_store_attribute_json_build_column text[] := array[]::text[];
   	_key text;
   	_value text;
   	_query_mapping_table text := '';
   	begin
   		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
  		 	continue when _key = 'group';
   			_store_attributes_column := array_append(_store_attributes_column, 'sm.'||_key||'');
   			_store_attribute_json_build_column := array_append(array_append(_store_attribute_json_build_column, ''''||_key||''''),'X.'|| _key ||'');
   		end loop;
   		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $1));
    		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
   		_query_table_filters := "global".form_table_query($3);
   		_query_mapping_table := 'SELECT * FROM "global".product_store_mapping_tag' || ("global".form_main_table_filters('product_store_mapping_tag', $4));
   		raise notice '_store_attribute_json_build_column: %',_store_attribute_json_build_column;
   		_query_combine := '
   	SELECT X.store_code, X.store_name, X.store_description, X.active, json_build_object(' || array_to_string(_store_attribute_json_build_column, ' ,') ||'), X.is_mapped, X.num_products_mapped, X.mapped_products FROM (select sm.*,
   	case
   		when count(psm.product_code) > 0 then true
   		else false
   	end as is_mapped,
   	concat(count(distinct psm.product_code), ''/'', ' || _product_codes_len || ') as num_products_mapped,
   	array_agg(distinct psm.product_code) as mapped_products
	--count(distinct psm.product_code) as mapped_count
    from (SELECT main.store_name, main.active, main.store_description, attributes.*  FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
   		left join (
   	select
   		psm.product_code,
   		psm.store_code,
   		psm.validity
   	from
   		"global".product_store_mapping_tag psm join (' || _query_mapping_table || ') map_table on psm.product_code = map_table.product_code and psm.store_code = map_table.store_code and psm.attribute_name = map_table.attribute_name 
   	where
   		psm.product_code = any(''' || $5::varchar || '''::varchar[])) psm
   		on
   	sm.store_code = psm.store_code
   	and psm.validity is not null
   group by
   	sm.store_name,
   	sm.active,
  	sm.store_description,
   	' || array_to_string(_store_attributes_column, ', ') || '
   		) X '  || _query_table_filters;
   	raise notice 'query: %', _query_combine;
   	RETURN QUERY execute _query_combine;
    	end
   $function$
;
