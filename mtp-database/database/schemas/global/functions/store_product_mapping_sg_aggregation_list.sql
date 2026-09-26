--liquibase formatted sql
--changeset liquibase:store_product_mapping_sg_aggregation_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_product_mapping_sg_aggregation_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_sg_aggregation_list(input refcursor, integer[], jsonb, jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_sg_aggregation_list(input refcursor, integer[], jsonb, jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$ 
declare
_query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_product_attribute_json_build_column text[] := array['''product_code''', 'X.product_code']::text[];
_key text;
_queru_sa text;
_value text;
_aggr_level text;
_final_query text;

begin
   _aggr_level := global.fetch_aggregation_level();
   $6 = $6 || $7;
_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);

_queru_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $6);

_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';
_query_table_filters := "global".form_table_query($5);
_query_combine := 'SELECT * FROM (select pm.*, 
 psm.*
from
   (
      select
         psm.validity,sgm.*,psm.aggregation_code
      from
         (
            select distinct
               store_attr.*
            from
               global.store_groups_mapping sgm1 join (' || _queru_sa  ||
            ') store_attr on store_attr.store_code = sgm1.store_code where
               sg_code = any(''' || $2::varchar || '''::int[])
         )
         sgm 
         join
            global.aggregation_mapping_aggregation_store psm 
            on sgm.store_code = psm.store_code 
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
where
   psm.validity is not null 
)
X ' || _query_table_filters;
 raise notice '%',
_query_combine;
if $8 is true 
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

