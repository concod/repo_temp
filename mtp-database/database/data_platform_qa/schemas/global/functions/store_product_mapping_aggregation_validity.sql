--liquibase formatted sql
--changeset liquibase:store_product_mapping_aggregation_validity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_product_mapping_aggregation_validity
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_aggregation_validity(input refcursor, text[], jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_aggregation_validity(input refcursor, text[], jsonb, jsonb, jsonb, boolean) 
RETURNS refcursor LANGUAGE plpgsql AS $function$ 
declare
_query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_final_query text;
_aggr_level text;
_store_codes_len int := array_length($2, 1);
begin
$4 = $3 || $4;
_aggr_level := global.fetch_aggregation_level();
_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
_query_table_filters := "global".form_table_query($5);
_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';
_query_combine := 'SELECT * FROM (
 
select
   pm.*,
   psm.validity 
from
   (
      select
         aggregation_code,
         store_code,
         validity 
      from
         "global".aggregation_mapping_aggregation_store 
      where
         store_code = any(''' || concat($2) || '''::varchar[]) 
   )
   psm 
   join
      (
         SELECT
            alf.* 
         FROM
            global.aggregation_level_filter alf 
            JOIN
               (
                  ' || _query_pa || '
               )
               attributes 
               ON alf.aggregation_code = attributes.aggregation_code 
      )
      pm 
      on pm.aggregation_code = psm.aggregation_code 
      and psm.validity is not null 
)
X ' || _query_table_filters;
 raise notice '%',
_query_combine;
if $6 is true 
then
   _final_query := 'select count(*) from (' || _query_combine || ') temp' ;
else
   _final_query := _query_combine;
end
if;
OPEN $1 FOR execute _final_query;
RETURN $1;
end
$function$ ;
