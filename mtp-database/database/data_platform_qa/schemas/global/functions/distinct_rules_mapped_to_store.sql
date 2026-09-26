
--liquibase formatted sql
--changeset akshay.jain:distinct_rules_mapped_to_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:distinct_rules_mapped_to_store
--comment: initial changeset for distinct_rules_mapped_to_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.distinct_rules_mapped_to_store(refcursor, text, text[], jsonb);
CREATE OR REPLACE FUNCTION global.distinct_rules_mapped_to_store(refcursor, text, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_final varchar;
_query_meta_filters text;
_where_clause text;
_query_sa text;
/*
sample call:
select * from global.distinct_rules_mapped_to_store('cur', '1', '{2260_200_4205_10847_1}', '{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}')
fetch all in "cur";
*/
BEGIN
   _query_meta_filters := global.form_table_query($4);
   
   _query_combine := 'select * from (select distinct rule_code, rcl_dimension , validity
						from global.rcl_product_mapping_product_store_rule join global.rcl_product_mapping_product_store
						using (rule_code, rcl_code) 
						where validity is not null and psa_name = ''' || $2 || ''' and 
						psa_code  in (''' || array_to_string($3, ''',''', '') || ''') ) X ' || _query_meta_filters;
  	 raise notice 'data: %', _query_combine;
     open $1 for execute _query_combine;
	return $1;
END
$function$
;