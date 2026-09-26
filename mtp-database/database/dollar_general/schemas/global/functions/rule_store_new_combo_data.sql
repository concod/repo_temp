--liquibase formatted sql
--changeset akshay.jain@impact:rule_store_new_combo_data_dg_set_date runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:handled_null_main_mapping_dg_set_date
--comment: hardcoded set date to be viewed as set week on Ui
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
_hash_cols text;
_rcl_codes integer[];
_levels text[];
/*
This function is to get store, product info by passing list of rule_codes and store_codes
--sample call--
select * from global.rule_store_new_combo_data('cur', '{1,2,3}'::int4[],'{10005347, 10005347, 10005347}'::int4[]); 
fetch all from "cur"; */
begin
	
	--TODO : module code is fetched here based on rcl master and module master but ideally should be sent from front-end only
	
	select
		array_agg(distinct rcl_code),
		'array[' || string_agg(distinct 'rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[]', array_agg(distinct lev) into _rcl_codes, _hash_cols, _levels 
	from global.rcl_master, unnest(level) as lev
	where not is_deleted
	and module_code in (select distinct module_code from global.module_master join global.rcl_master using (module_code) where module_name = 'Product Mapping' and application_code = 1 limit 1)  

	group by is_deleted;

	
	
    
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
		_query_part := 'select  m.store_code, set_date, pmps.*, r.rcl_dimension from global.rcl_product_mapping_product_store pmps join global.rcl_product_mapping_product_store_rule r using(rcl_code, rule_code) join global.product_attributes_filter ON md5(r.rcl_dimension::text) = any('|| _hash_cols || ') ' || _rule_filter ;
	else 
		_query_part := 'select  m.store_code, set_date, pmps.*, r.rcl_dimension  from global.rcl_product_mapping_product_store pmps join global.rcl_product_mapping_product_store_rule r using(rcl_code, rule_code) join global.product_attributes_filter ON md5(r.rcl_dimension::text) = any('|| _hash_cols || ')';
	end if;
	raise notice 'rule filter: %', _rule_filter;
	raise notice 'query: %', _query_part;

     open $1 for execute _query_part;
	return _query_part;
END
$function$
;

