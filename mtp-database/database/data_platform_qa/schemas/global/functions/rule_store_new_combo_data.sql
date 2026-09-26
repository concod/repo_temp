--liquibase formatted sql
--changeset akshay.jain:rule_store_new_combo_data runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:handled_null_main_mapping
--comment: handled_null_main_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rule_store_new_combo_data(refcursor, integer[], text[]);
CREATE OR REPLACE FUNCTION global.rule_store_new_combo_data(refcursor, integer[], text[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
/*
This function is to get store, product info by passing list of rule_codes and store_codes
--sample call--
select * from global.rule_store_new_combo_data('cur', '{1,2,3}'::int4[],'{10005347, 10005347, 10005347}'::int4[]); 
fetch all from "cur"; */
BEGIN
    
	if cardinality($2) > 0 then
		if cardinality($3) > 0 then
			_rule_filter := ' join global.product_store_attributes_filter m using(psa_code) where pmps.rule_code = any('|| quote_literal($2) ||') and m.store_code = any('|| quote_literal($3) ||') and validity is not null';
		else
			_rule_filter := ' join global.product_store_attributes_filter m using(psa_code) where pmps.rule_code = any('|| quote_literal($2) ||') and validity is not null';
		end if;
	else
		if cardinality($3) > 0 then
			_rule_filter := ' join global.product_store_attributes_filter m using(psa_code) where m.store_code = any('|| quote_literal($3) ||') and validity is not null';
		end if;
	end if;
	if cardinality($2) > 0 or cardinality($3) > 0 then
		_query_part := 'select m.store_code, pmps.*, r.rcl_dimension from global.rcl_product_mapping_product_store pmps join global.rcl_product_mapping_product_store_rule r using(rcl_code, rule_code) ' || _rule_filter ;
	else 
		_query_part := 'select m.store_code, pmps.*, r.rcl_dimension  from global.rcl_product_mapping_product_store pmps join global.rcl_product_mapping_product_store_rule r using(rcl_code, rule_code) ';
	end if;
	raise notice 'rule filter: %', _rule_filter;
	raise notice 'query: %', _query_part;

     open $1 for execute _query_part;
	return _query_part;
END
$function$
;

