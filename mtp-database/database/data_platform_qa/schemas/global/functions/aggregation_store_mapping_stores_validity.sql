--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:aggregation_store_mapping_stores_validity_MTP-52725 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mapping_is_upload_feature
--comment: added created type and updated type columns for mapping is_upload
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.aggregation_store_mapping_stores_validity(input text[], jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.aggregation_store_mapping_stores_validity(input text[], jsonb, jsonb, jsonb) 
RETURNS TABLE(store_code character varying, store_name character varying, attributes json, active boolean, validity datemultirange, created_type boolean, updated_type boolean) LANGUAGE plpgsql AS $function$ 
declare 
_query_sm text := '';
_query_sa text := '';
_query_table_filters text := '';
_query_combine text;
_store_attribute_json_build_column text[] := array['''store_code''', 'X.store_code']::text[];
_key text;
_value text;
begin
   for _key, _value in 
   SELECT
      * 
   FROM
      jsonb_each_text($3) 
   WHERE
      value IS NOT NULL loop continue 
      when
         _key = 'group';
_store_attribute_json_build_column := array_append(array_append(_store_attribute_json_build_column, '''' || _key || ''''), 'X.' || _key || '');
end
loop;
_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
_query_table_filters := "global".form_table_query($4);
_query_combine := 'SELECT X.store_code, X.store_name, json_build_object(' || array_to_string(_store_attribute_json_build_column, ' ,') || '), X.active, X.validity, X.created_type, X.updated_type FROM (select sm.*,
 psm.validity 
   from
      (
         SELECT
            main.store_name,
            main.active,
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
      left join
         (
            select
               aggregation_code,
               store_code,
               validity,
               uc1.updation_value as created_type,
               uc2.updation_value as updated_type 
            from
               "global".aggregation_mapping_aggregation_store
            left join "global".updation_config uc1 on uc1.updation_key = "global".aggregation_mapping_aggregation_store.creation_source_id
            left join "global".updation_config uc2 on uc2.updation_key = "global".aggregation_mapping_aggregation_store.current_updation_id
            where
               aggregation_code = any(''' || $1::varchar || '''::varchar[])
         )
         psm 
         on sm.store_code = psm.store_code 
   where
      psm.validity is not null 
   )
   X ' || _query_table_filters;
 raise notice '%',
   _query_combine;
RETURN QUERY execute _query_combine;
end
$function$ ;
