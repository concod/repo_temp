--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:store_product_mapping_aggregation_list_feature-22219_bugfix runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added_validity_filter_bugfix
--comment: fixed bug in validity filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_aggregation_list(input refcursor, text[], jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_aggregation_list(input refcursor, text[], jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$ 
declare 
_query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_store_codes_len int := array_length($2, 1);
_projection_cols text[] := array[]::text[];
_key text;
_value text;
_final_query text;
_aggr_level text;
_query_mapping_table text:= '';
json_array jsonb;
begin
   $4 = $3 || $4;
_aggr_level := global.fetch_aggregation_level();
--_query_pm := 'SELECT product_code FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';
SELECT jsonb_build_object(
    'store_code',
    jsonb_build_array(
        jsonb_build_object(
            'type', 'list',
            'operator', 'in',
            'values', jsonb_agg(arr)
        )
    )
) into json_array
FROM unnest($2::text[]::text[]) AS arr;

$6 := $6 || json_array;

_query_mapping_table := 'SELECT aggregation_code, store_code, validity FROM "global".aggregation_mapping_aggregation_store' || ("global".form_main_table_filters('aggregation_mapping_aggregation_store', $6));

for _key, _value in 
select
   * 
from
   jsonb_each_text($4) loop _projection_cols := array_append(_projection_cols, _key);
end
loop;
_query_table_filters := "global".form_table_query($5);
_query_combine := 'SELECT * FROM (SELECT
 X.aggregation_code,
X.products,
X.is_mapped,
X.num_stores_mapped,
X.mapped_stores,
' || array_to_string(_projection_cols, ',
', '') || ' 
FROM
   (
      select
         pm.aggregation_code,
         pm.products,
         case
            when
               count(psm.store_code) > 0 
            then
               true 
            else
               false 
         end
         as is_mapped, concat(count(psm.store_code), ''/'', ' || _store_codes_len || ') as num_stores_mapped, array_agg(psm.store_code) as mapped_stores 
      from
         (
            SELECT
               alf.* 
            from
               global.aggregation_level_filter alf 
               JOIN
                  (
                     ' || _query_pa || '
                  )
                  attributes 
                  ON alf.aggregation_code = attributes.aggregation_code
         )
         pm 
         left join
            (' || _query_mapping_table || ')
            psm 
            on pm.aggregation_code = psm.aggregation_code 
            and psm.validity is not null 
      group by
         pm.aggregation_code,
         pm.products 
   )
   X 
   join
      global.aggregation_level_filter paf 
      on X.aggregation_code = paf.aggregation_code 
)
Y ' || _query_table_filters;
 raise notice '%',
_query_combine;
if $7 is true 
then
   _final_query := 'select count(*) from (' || _query_combine || ') temp' ;
else
   _final_query := _query_combine;
end
if;
open $1 for execute _final_query;
return _query_combine;
end
$function$
;



