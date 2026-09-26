--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:distinct_store_info_rcl_level_return_query runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-48131
--comment: modified for active stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.distinct_store_info_rcl_level(refcursor, text[], jsonb, jsonb);
DROP FUNCTION IF EXISTS global.distinct_store_info_rcl_level(refcursor, text[], jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.distinct_store_info_rcl_level(refcursor, text[], jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;

_final varchar;
_query_meta_filters text;
_where_clause text;
_query_sa text := '';
_query_psa text;
suffix_multiple_dimension_table text := '';
_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';

/*
sample call:
select
	*
from
	global.distinct_store_info_rcl_level('cur',
	'{}',
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["CAN"], "dimension": "product_store"}], "psa_name": [{"type": "list", "operator": "in", "values": [], "dimension": "product_store"}], "psa_code": [{"type": "list", "operator": "in", "values": [], "dimension": "product_store"}]}',
	'{"channel": [{"type": "list", "operator": "in", "values": ["E-Commerce"]}]}',
	'{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}');
fetch all in "cur";
*/
BEGIN
    _query_meta_filters := global.form_table_query($5);
   
	select attribute_value->>'suffix' from global.tenant_attribute_master tam where name = 'mapping_multidimension_suffix' into suffix_multiple_dimension_table;
   
   _query_psa := "global".form_attribute_table_filters_v3('product_store_attributes', '', $3, suffix_multiple_dimension_table);
  
 	raise notice 'data: %', _query_psa;
   _query_combine := 'select psa_name, array_agg(distinct psa_code) as psa_code from (' || _query_psa || ') X group by psa_name ';
  	
   if $4 != '{}'::jsonb then
		$4 = $4 || _active_filter;
   		_query_sa := "global".form_attribute_table_filters_v3('store_attributes', 'store_code', $4);
   		raise notice 'query sa : %', _query_sa;
   		_query_combine := 'select * from ('||_query_combine || ') X JOIN (' || _query_sa || ') Y on X.psa_name = Y.store_code ';
   end if;
  
  	_query_combine := _query_combine || _query_meta_filters;
     open $1 for execute _query_combine;
	return _query_combine;
END
$function$
;
