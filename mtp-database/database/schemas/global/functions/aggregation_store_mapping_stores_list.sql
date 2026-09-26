--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:aggregation_store_mapping_stores_list_mtp_22219_bugfix runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:aggregation_store_mapping_stores_list_mtp_22219_bugfix
--comment: fixed bug in validity filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.aggregation_store_mapping_stores_list(input text[], jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.aggregation_store_mapping_stores_list(input text[], jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_code character varying, store_name character varying, store_description text, active boolean, attributes json, is_mapped boolean, num_products_mapped text, mapped_products character varying[])
 LANGUAGE plpgsql
AS $function$
 
 declare
 
 _query_sm text := '';
 
 _query_sa text := '';
 
 _query_table_filters text := '';
 
 _query_combine text;
 
 _product_codes_len int := array_length($1, 1);
 
 _store_attributes_column text[]:= array['sm.store_code']::text[];
 
 _store_attribute_json_build_column text[] := array[]::text[];
 
 _key text;
 
 _value text;

_query_mapping_table text;

json_array jsonb;
 
 begin
 
 for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
 
 _store_attributes_column := array_append(_store_attributes_column, 'sm.'||_key||'');
 
 _store_attribute_json_build_column := array_append(array_append(_store_attribute_json_build_column, ''''||_key||''''),'X.'|| _key ||'');
 
 end loop;
 
 _query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
 
 _query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
 
 _query_table_filters := "global".form_table_query($4);



SELECT jsonb_build_object(
'aggregation_code',
jsonb_build_array(
    jsonb_build_object(
        'type', 'list',
        'operator', 'in',
        'values', jsonb_agg(arr)
    )
)
) into json_array
FROM unnest($1::text[]::text[]) AS arr;

$5 := $5 || json_array;

_query_mapping_table := 'SELECT aggregation_code, store_code, validity FROM "global".aggregation_mapping_aggregation_store' || ("global".form_main_table_filters('aggregation_mapping_aggregation_store', $5));
 
 raise notice '_store_attribute_json_build_column: %',_store_attribute_json_build_column;
 
 _query_combine := '
 
 SELECT X.store_code, X.store_name, X.store_description, X.active, json_build_object(' || array_to_string(_store_attribute_json_build_column, ' ,') ||'), X.is_mapped, X.num_codes_mapped, X.mapped_codes FROM (select sm.*,
 
 case
 
 when count(psm.aggregation_code) > 0 then true
 
 else false
 
 end as is_mapped,
 
 concat(count(psm.aggregation_code), ''/'', ' || _product_codes_len || ') as num_codes_mapped,
 
 array_agg(psm.aggregation_code) as mapped_codes,
 
 count(psm.aggregation_code) as mapped_count

 from (SELECT main.store_name, main.active, main.store_description, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
 
 left join (' || _query_mapping_table || ') psm
 
 on
 
 sm.store_code = psm.store_code
 
 and psm.validity is not null
 
 group by
 
 sm.store_name,
 
 sm.active,
 
 sm.store_description,
 
 ' || array_to_string(_store_attributes_column, ', ') || '
 
 ) X ' || _query_table_filters;
 
 raise notice 'query: %', _query_combine;
 
 RETURN QUERY execute _query_combine;
 
 end
 
 $function$
;


