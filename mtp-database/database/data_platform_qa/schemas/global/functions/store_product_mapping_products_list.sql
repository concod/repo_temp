--liquibase formatted sql
--changeset chaitanyaprasad.reddy:store_product_mapping_products_list_feature-mtp-29229 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:feature-mtp-29229
--comment: added sorting functionality on mapped stores column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_products_list(input refcursor, text[], jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_products_list(input refcursor, text[], jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$ 
declare 
_query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_store_codes_len int := array_length($2, 1);
_projection_cols text[] := array['product_name', 'product_description']::text[];
_key text;
_value text;
_final_query text;
_agg_level_db text;
_agg_level text := 'product_code';
_fl boolean;
_query_mapping_table text := '';
json_array jsonb;
begin
   _agg_level_db = global.fetch_aggregation_level();
if _agg_level_db is not null 
then
   _agg_level = _agg_level_db;
end
if;
for _key, _value in 
SELECT
   * 
FROM
   jsonb_each_text($4) 
WHERE
   value IS NOT NULL loop if _key = _agg_level 
then
   _fl := true;
end
if;
end
loop;
if _fl is false 
then
   $4 = $4 || jsonb_build_object(_agg_level_db, jsonb_build_array());
end
if;
--SELECT jsonb_agg(arr) into json_array FROM unnest($2::text[]) AS arr;

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

_query_pm := 'SELECT product_code FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
_query_mapping_table := 'SELECT product_code, store_code, validity FROM "global".product_mapping_product_store' || ("global".form_main_table_filters('product_mapping_product_store', $6));
for _key, _value in 
select
   * 
from
   jsonb_each_text($4) loop _projection_cols := array_append(_projection_cols, _key);
end
loop;
_query_table_filters := "global".form_table_query($5);
_query_combine := 'SELECT *,' || _agg_level || ' as aggregation_code FROM (SELECT
 X.product_code,
X.is_mapped,
X.num_stores_mapped,
X.mapped_stores,
X.mapped_count,
' || array_to_string(_projection_cols, ',
', '') || ' 
FROM
   (
      select
         pm.product_code,
         case
            when
               count(psm.store_code) > 0 
            then
               true 
            else
               false 
         end
         as is_mapped, concat(count(psm.store_code), ''/'', ' || _store_codes_len || ') as num_stores_mapped, array_agg(psm.store_code) as mapped_stores, count(psm.store_code) as mapped_count 
      from
         (
            SELECT
               main.product_code 
            FROM
               (
                  ' || _query_pm || '
               )
               main 
               JOIN
                  (
                     ' || _query_pa || '
                  )
                  attributes 
                  ON main.product_code = attributes.product_code
         )
         pm 
         left join
            (' ||  _query_mapping_table || ')
            psm 
            on pm.product_code = psm.product_code 
            and psm.validity is not null 
      group by
         pm.product_code 
   )
   X 
   join
      global.product_attributes_filter paf 
      on X.product_code = paf.product_code 
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
OPEN $1 FOR execute _final_query;
RETURN _query_combine;
end
$function$
;


