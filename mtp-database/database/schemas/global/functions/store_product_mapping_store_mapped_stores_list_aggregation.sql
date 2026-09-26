--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:store_product_mapping_store_mapped_stores_list_aggregation_MTP-52725 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mapping_is_upload_feature
--comment: added created type and updated type columns for mapping is_upload
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_store_mapped_stores_list_aggregation(input text[], text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_mapping_store_mapped_stores_list_aggregation(input text[], text, jsonb, jsonb, jsonb)
RETURNS TABLE(store_code character varying, store_name character varying, attributes jsonb, validity datemultirange, created_type boolean, updated_type boolean) LANGUAGE plpgsql AS $function$
/*
* 
* calling statement: 
select * from global.store_product_mapping_store_mapped_stores_list('{"12345","123456","123_test_123","AutoTest_Feb24_SI1","AutoTest_Jan31_SI_1","AutoTest_Oct13_storeId1","AutoTest_Oct13_storeid","USRO0002"}'::varchar[],
'044736010612',
'{}',
'{"region": []}',
'{"meta": {"range": [],"sort": [],"search": [],"limit": {"limit": 10,"page": 1}}}')
*/
declare 
_query_sm text := '';
_query_sa text := '';
_query_table_filters text := '';
_query_combine text;
_product_codes_len int := array_length($1, 1);
_attributes_cols text[] := array['''store_code''', 'store_code']::text[];
_key text;
_value text;
begin
   _query_sm := 'SELECT store_code, store_name FROM "global".store_master' || ("global".form_main_table_filters('store_master', $3));
_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
for _key, _value in 
select
   * 
from
   jsonb_each_text($4) loop continue 
   when
      _key = 'group';
_attributes_cols := array_append(array_append(_attributes_cols, '''' || _key || ''''), '' || _key || '');
end
loop;
_query_table_filters := "global".form_table_query($5);
_query_combine := 'SELECT 
 store_code,
store_name,
jsonb_build_object(' || array_to_string(_attributes_cols, ' , ') ||') as attributes,
validity,
created_type,
updated_type
FROM
   (
      select
         sm.*,
         psm.validity,
         psm.created_type,
         psm.updated_type
      from
         (
            SELECT
               main.store_name,
               attributes.* 
            FROM
               (
                  ' || _query_sm || '
               )
               main 
               JOIN
                  (
                     ' || _query_sa || '
                  )
                  attributes 
                  ON main.store_code = attributes.store_code
         )
         sm 
         join
            (
               select distinct
                  x.store_code,
                  psm.validity,
                  uc1.updation_value as created_type,
                  uc2.updation_value as updated_type 
               from
                  (
                     select
                        unnest(''' || $1::varchar || '''::varchar[]) store_code,
                        ''' || $2 || ''' aggregation_code
                  )
                  x 
                  join
                     global.aggregation_mapping_aggregation_store psm 
                     on x.store_code = psm.store_code 
                     and x.aggregation_code = psm.aggregation_code
                  left join "global".updation_config uc1 on uc1.updation_key = "global".aggregation_mapping_aggregation_store.creation_source_id
					   left join "global".updation_config uc2 on uc2.updation_key = "global".aggregation_mapping_aggregation_store.current_updation_id
            )
            psm 
            on sm.store_code = psm.store_code 
            and psm.validity is not null 				--group by
            -- sm.store_code,
            -- sm.store_name,
            -- sm.region,
            -- psm.validity
   )
   X ' || _query_table_filters;
 raise notice '%',
   _query_combine;
RETURN QUERY execute _query_combine;
end
$function$ ;
