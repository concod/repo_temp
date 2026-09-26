--liquibase formatted sql
--changeset akshay.jain@impact:rule_store_new_exception_data_renderer_v3_update runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:rule_store_new_exception_data_renderer_v3_update
--comment: added support for updated at and by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rule_store_new_exception_data_renderer_v3(text, rule_list integer[], prod_filter_list jsonb, store_list text[], store_filter_list jsonb, jsonb);
DROP FUNCTION IF EXISTS global.rule_store_new_exception_data_renderer_v3(text, rule_list integer[], prod_filter_list jsonb, store_list text[], store_filter_list jsonb, jsonb, int, int);
CREATE OR REPLACE FUNCTION global.rule_store_new_exception_data_renderer_v3(text, rule_list integer[], prod_filter_list jsonb, store_list text[], store_filter_list jsonb, jsonb, int, int)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_input_arg_str text;
query text;
_query_meta_filters text := '';
rule_codes text[];
store_codes text[];
filter_item jsonb;
meta_item jsonb;
fetch_rule_code_sp text;
rule_codes_query text;
store_codes_query text;
rule_codes_string text;
rule_code text;
rule_codes_list text;
store_code_list text;
_key text;
_value text;
input_arg text[];
_refcursor_sp_query text;
i int;
validity datemultirange;
/*
This function is to create persistent intermediate table out of exception preview screen and return data to put on UI based on limit and meat filter
--sample call--
select * from global.rule_store_new_exception_data_renderer('cur', 'global.xyz', '{1,2,3}'::int4[],'{10005347, 10005347, 10005347}', '{"search": [{"column": "color", "type": "str", "search_type": null, "pattern": "T"}], "sort": [{"column": "product_code", "order": "asc"}], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}'); 
fetch all from "cur"; */
begin
	-- handling scenario when rule code is present
	filter_item := prod_filter_list[1];
	--raise notice 'filter item %', filter_item->'rule_code_custom';
	if $2 != '{}' then
		raise notice 'here';
		--SELECT array_agg(element::text)
	    --INTO rule_codes
	    --FROM jsonb_array_elements_text(filter_item->'rule_code_custom') AS element;
		rule_codes := $2;
		raise notice 'rule_codesfirst %', $2;
	-- handling scenario when filters are present
	else
		for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
 			--_value := REGEXP_REPLACE(_value, $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
 			_value := replace(_value,'''','''''');
 			input_arg := array_append(input_arg, ''''||_value::text||'''');
 		end loop;
 		_input_arg_str := ARRAY_TO_STRING(input_arg, ',', '');
 		
 		--if $4 is true then
 			
		query := 'select * from global.rule_list_product_only(' ||  _input_arg_str || ')';
	
		raise notice 'CIURSOR query: %', query;
		execute query into _refcursor_sp_query;
	
		rule_codes_query := 'select array_agg(rule_code) from (' || _refcursor_sp_query || ') Temp';
		raise notice 'rule_codes_query: %', rule_codes_query;
		execute rule_codes_query into rule_codes;

	end if;


	input_arg := '{}';
	filter_item := store_filter_list[2];
	--raise notice 'filter item %', filter_item->'rule_code_custom';
	--if filter_item ? 'store_code_custom' then
	if $4 != '{}' then
		raise notice 'here';
		--SELECT array_agg(element::text)
	    --INTO store_codes
	    --FROM jsonb_array_elements_text(filter_item->'store_code_custom') AS element;
		store_codes := $4;
		raise notice 'store_codesfirst %', $4;
	-- handling scenario when filters are present
	else
		for _key, _value in SELECT * FROM jsonb_each_text($5) WHERE value IS NOT NULL loop
 			--_value := REGEXP_REPLACE(_value, $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
 			_value := replace(_value,'''','''''');
 			input_arg := array_append(input_arg, ''''||_value::text||'''');
 		end loop;
 		_input_arg_str := ARRAY_TO_STRING(input_arg, ',', '');
 		
 		--if $4 is true then
 			
		query := 'select * from global.store_product_mapping_list(' ||  _input_arg_str || ')';
	
		raise notice 'CIURSOR query: %', query;
		execute query into _refcursor_sp_query;
	
		store_codes_query := 'select array_agg(store_code) from (' || _refcursor_sp_query || ') Temp';
		raise notice 'store_codes_query: %', store_codes_query;
		execute store_codes_query into store_codes;
	
		
	
 			--query := 'create temp table test_table_set_all as select * from ( ' ||  _refcursor_sp_query || ' ) temp';
 			--execute query;	 	
 	
 	
 	
		--query := 'select * from global.rule_list_product_only' || '(' || quote_literal($1) || ',' || quote_literal(filter_item) || ',' || quote_literal(meta_item) || ',' || quote_literal(fetch_rule_code_sp) || ')';
		--raise notice 'query: %', query;
		--execute query into rule_codes_query;
		--rule_codes_query := 'select array(select rule_code from (' || rule_codes_query || ') B)';
		--raise notice 'rule_codes_query: %', rule_codes_query;
		--execute rule_codes_query into rule_codes;
		--close $1;
	end if;



	--rule_codes_list := '{' || array_to_string(rule_codes, ',') || '}';

	--raise notice 'rule list temp: %', rule_codes_list;

	--store_code_list := '{' || array_to_string(store_codes, ',') || '}';

	--raise notice 'store list temp: %', store_code_list;
	
	 _query_meta_filters := global.form_table_query($6);
	
	select * from "global".rule_store_new_combo_data('123cw', rule_codes::integer[], store_codes) into _query_part;

	--Right now validity column generated as part of this SP is the Mapping validity between rule and store band. But for DG they want to show on UI explicit date range as validity so setting that only by update query;

	query := 'create table if not exists global.rcl_psm_new_exception_' || $1::text || ' as select * from ( ' ||  _query_part || ' ) temp';
	--raise notice 'query: %', query; 
 	execute query;
 
 
 	select (attribute_value->>'MappingExceptionModule')::jsonb->>'BY_DEFAULT_DATE_DISPLAY_NEW_EXCEPTION' from global.tenant_attribute_master tam where name = 'core_screen_configuration' into validity;
 
 	query:= 'update global.rcl_psm_new_exception_' || $1::text || ' set updated_at = now(), created_at = now(), updated_by = ' || $7 || ',' || 'created_by=' || $8 || ', validity = ' || quote_literal(validity);
 
 	execute query;
 
 	--_query_combine = 'select * from global.rcl_psm_new_exception_' || $2::text || _query_meta_filters;
 
 	--open $1 for execute _query_combine;
	--return $1;
 
END
$function$
;
