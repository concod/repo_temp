--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:MTP-42667 runOnChange:true stripComments:false splitStatements:false context:MTP-42667 labels:MTP-42667
--comment: initial changeset for rule_store_new_combo_data_upload
--rollback: SELECT 1
drop function if exists global.rule_store_new_combo_data_upload(refcursor, text[], integer[], integer[]);
CREATE OR REPLACE FUNCTION global.rule_store_new_combo_data_upload(refcursor, text[], integer[], integer[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_product_store_table_join text := '';
_store_code_where_caluse text := '';
_primary_sku_where_caluse text := '';
_l0_name_where_clause text := '';
/*
This function is to get store, product info by passing list of l0_name , primary_sku and store_codes
--sample call--
select * from global.rule_store_new_combo_data_upload('cur', '{2759_2023 Q3 MAG Hardware}':text[],'{1,2,3}'::int4[],'{10005347, 10005347, 10005347}'::int4[]); 
fetch all from "cur"; 
This function is more or less DG use case specific for any other client we might need to revisit
*/
begin
	_product_store_table_join := ' join global.product_store_attributes_filter m using(psa_code)';
	_store_code_where_caluse := ' m.store_code = any('|| quote_literal($4) ||')';
	_l0_name_where_clause := ' r.rcl_dimension ->> ''l0_name'' = any('|| quote_literal($2) ||')';
	_primary_sku_where_caluse := ' r.rcl_dimension ->> ''primary_sku'' = any('|| quote_literal($3) ||')';
		
	_query_part := 'SELECT m.store_code store_code, pmps.rule_code rule_code, m.psa_code psa_code, m.psa_name psa_name, pmps.rcl_code rcl_code  
					from global.rcl_product_mapping_product_store pmps join global.rcl_product_mapping_product_store_rule r using(rcl_code, rule_code) 
					 ' || _product_store_table_join || ' where ' || _store_code_where_caluse || ' and ' || _l0_name_where_clause || ' and '
						|| _primary_sku_where_caluse;
                        
	raise notice 'query: %', _query_part;
    open $1 for execute _query_part;
	return $1;
END
$function$

;