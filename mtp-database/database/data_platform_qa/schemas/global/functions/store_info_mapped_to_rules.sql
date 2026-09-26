--liquibase formatted sql
--changeset akshay.jain:store_info_mapped_to_rules_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:added_total_count_logic
--comment: modified for active stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_info_mapped_to_rules(refcursor, text[], text[], jsonb);
DROP FUNCTION IF EXISTS global.store_info_mapped_to_rules(refcursor, text[], text[], jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS global.store_info_mapped_to_rules(refcursor, text[], text[], jsonb, jsonb, jsonb, bool);
CREATE OR REPLACE FUNCTION global.store_info_mapped_to_rules(refcursor, text[], text[], jsonb, jsonb, jsonb, fetch_count bool)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_final varchar;
_query_meta_filters text;
_where_clause text;
suffix_multiple_dimension_table text := '';
_query_psa text := '';
_join_clause text := '';
_query_sa text := '';
_fetch_clause text := '';
_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';

/*
sample call:
select * from global.store_info_mapped_to_rules('cur', '{1,2,3}', '{}'::text[], '{"limit":{"limit":10, "page":1}}'::jsonb);
fetch all in "cur";
*/
BEGIN
	--$3 is here for validity filter and $2 for rule code list
	select * from global.form_rcl_product_validity_filter('{}'::jsonb, $3::text[]) into _where_clause;
	_query_meta_filters := global.form_table_query($6);
   
	select attribute_value->>'suffix' from global.tenant_attribute_master tam where name = 'mapping_multidimension_suffix' into suffix_multiple_dimension_table;

	if $4 != '{}'::jsonb and $5 != '{}'::jsonb then

		-- added store name as default column to display
		$5 = $5 || '{"store_name":[]}'::jsonb;
		$5 = $5 || _active_filter;
	
		$4 = $4 || '{"psa_name":[]}'::jsonb;
		
		_query_psa := "global".form_attribute_table_filters_v3('product_store_attributes', '', $4, suffix_multiple_dimension_table);
		_query_sa := "global".form_attribute_table_filters_v3('store_attributes', 'store_code', $5);
		_query_psa := ' select * from (' ||  _query_psa || ') psa_query join (' || _query_sa || ') sa_query on psa_query.psa_name = sa_query.store_code';
		
		_join_clause := 'join (' || _query_psa || ') Y using (psa_name)';
	
	ELSIF $4 != '{}'::jsonb and $5 = '{}'::jsonb then
   
	   _query_psa := "global".form_attribute_table_filters_v3('product_store_attributes', '', $4, suffix_multiple_dimension_table);
	  
	   _query_psa := 'select distinct psa_name as psa_name from (' || _query_psa || ') X ';
	  
	   _join_clause := 'join (' || _query_psa || ') Y using (psa_name)';
	  
	  	_fetch_clause := ', Y.*';
	 
	 ELSIF $4 = '{}'::jsonb and $5 != '{}'::jsonb then

	 	-- added store name as default column to display
		$5 = $5 || '{"store_name":[]}'::jsonb;
		$5 = $5 || _active_filter;
   
	   _query_sa := "global".form_attribute_table_filters_v3('store_attributes', 'store_code', $5);
	  
	   --_query_psa := 'select distinct psa_name as psa_name from (' || _query_psa || ') X ';
	  
	  	
	  	_join_clause := 'join (' || _query_sa || ') Y on X.psa_name  = Y.store_code';
	  
	  _fetch_clause := ' , Y.* ';
	
	end if;

	-- Based on validity filter first checking sb_codes. Then re-fetching data for those sb_codes from table, so that if user tries to search for some range, and some sb_code and rule falls under that range then we should return other ranges as well for that same combo and not just which user tried to search

	if _where_clause is not null and length(_where_clause) > 0 then
	 	_query_part := 'select psa_name, rcl_code, validity from "global".rcl_product_mapping_product_store rpmps where rpmps.psa_name in (SELECT r.psa_name FROM "global".rcl_product_mapping_product_store r ' || _where_clause || ') and rpmps.rule_code in (' || array_to_string($2, ',') || ') and rpmps.validity is not null ';
    else
     	_query_part := 'select psa_name, rcl_code, validity from "global".rcl_product_mapping_product_store rpmps where rpmps.rule_code in (' || array_to_string($2, ',') || ') and rpmps.validity is not null';
    END IF;

   if fetch_count is false then
   _query_combine := 'select * from  (select * from (
   select psa_name, array_agg(validity) as validity
   from         
   (SELECT
                p.*
            FROM
                (' || _query_part || ') p
            JOIN global.rcl_master rm
                USING (rcl_code)
            WHERE NOT rm.is_deleted 
			)as A
            group by psa_name ) X ' || _join_clause || ' ) Z ' || _query_meta_filters;
	else
	_query_combine := 'select count(*) from  (select * from (
	   select psa_name, array_agg(validity) as validity
	   from         
	   (SELECT
	                p.*
	            FROM
	                (' || _query_part || ') p
	            JOIN global.rcl_master rm
	                USING (rcl_code)
	            WHERE NOT rm.is_deleted 
				)as A
	            group by psa_name ) X ' || _join_clause || ' ) Z ' || _query_meta_filters;
	end if;
	 
	raise notice 'query_combine: %', _query_combine;
     open $1 for execute _query_combine;
	return $1;
END
$function$
;
