--liquibase formatted sql
--changeset akshay.jain@impact:rule_list_pmps_exceptions3 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:handled_list_rule_code_store_codes
--comment: handled search on store code
--rollback: SELECT 1
drop function if exists global.rule_list_pmps_exceptions(refcursor, integer[], jsonb, text[], jsonb, jsonb);
drop function if exists global.rule_list_pmps_exceptions(refcursor, integer[], jsonb, text[], jsonb, jsonb,  text[]);
CREATE OR REPLACE FUNCTION global.rule_list_pmps_exceptions(refcursor, integer[], jsonb, text[], jsonb, jsonb, text[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_final varchar;
_query_meta_filters text;
_query_sa text;
_query_pa text;
_dimension text[];
_module_code text;
_additonal_query text := '';
/*
description: inputs $2 = list of rule code, $3 = store_filter, $4 = validity, $5 = meta filters, %6 = product filters.
This function is to list all the active exceptions on product_mapping_product_store table rules.
sample call: select * from global.rule_list_pmps_exceptions('cur', '{}'::int4[],
'{}'::jsonb,'{}'::text[], '{"limit":{
"limit":10, "page":1
}}'::jsonb, '{}');
fetch all from "cur";*/
begin
    _query_meta_filters := global.form_table_query($5);
    _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
    _query_pa := global.form_rcl_product_validity_filter($6, $4);

   	select distinct module_code from global.module_master join global.rcl_master using (module_code) where module_name = 'Product Mapping' and application_code = 1 limit 1 into _module_code;  

   
  	select * from global.form_attribute_table_filters_rcl_level('product_attributes', 'product_code', $6, '', _module_code) into _query_pa;

   
    SELECT '(' || string_agg(quote_literal(date_val), ', ') || ')' 
    INTO _final
    FROM unnest($4::TEXT[]) AS date_val;
   

if cardinality($2) > 0 then
	_query_pa := _query_pa || ' where rule_code = any('|| quote_literal($2) || ')';
end if;

   
/*
if cardinality($2) > 0 then
if _query_pa is not null then 
_where := ' JOIN global.rcl_product_mapping_product_store_rule r using(rule_code, rcl_code) ' || _query_pa || ' and r.rule_code = any('|| quote_literal($2) ||')';
else 
_where := ' JOIN global.rcl_product_mapping_product_store_rule r using(rule_code, rcl_code) where r.rule_code = any('|| quote_literal($2) ||')';
end if;
else
_where := ' JOIN global.rcl_product_mapping_product_store_rule r using(rule_code, rcl_code) '  || _query_pa;
end if;
*/

	
	if cardinality($2) > 0 and ($7 is null or cardinality($7) = 0)  then
		
		_additonal_query := ' and e.rule_code = any('|| quote_literal($2) || ') ';
	
	elsif cardinality($2) > 0 and cardinality($7) > 0 then
		
		_additonal_query := ' and e.rule_code = any('|| quote_literal($2) || ') and concat(e.rule_code, ''_'', e.store_code) = any('|| quote_literal($7) || ') ';
	
	elsif ($2 is null or cardinality($2) = 0) and cardinality($7) > 0 then
		
		_additonal_query := ' and concat(e.rule_code, ''_'', e.store_code) = any('|| quote_literal($7) || ') ';

	end if;


	_query_part := 'SELECT paf_rm.*, e.rcl_code, e.rule_code, e.validity, e.psa_name, e.psa_code, e.created_at, e.created_by, e.updated_at, e.updated_by, e.store_code as rm_store_code FROM "global".rcl_product_mapping_product_store_exceptions e join (' || _query_pa || ' ) paf_rm on paf_rm.rule_code = e.rule_code and paf_rm.rcl_code = e.rcl_code and paf_rm.psaf_store_code = e.store_code where validity is not null ' || _additonal_query ;
	

    _query_combine := '
		   select * from         
		   (SELECT
		                p.*, s.*
		            FROM
		                (' || _query_part || ') p
		join (' ||_query_sa || ') s on s.store_code = p.rm_store_code
		            ) as A
		            ' || _query_meta_filters ;
			raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
	return $1;
end
$function$
;