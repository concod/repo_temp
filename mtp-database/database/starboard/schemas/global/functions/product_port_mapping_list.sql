--liquibase formatted sql
--changeset satvik.sharma@impactanalytics.co:product_port_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Starboard-specific query for product-to-port mapping using product_port_table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_port_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_port_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean) 
RETURNS text LANGUAGE plpgsql AS $function$ 
/*
Added for starboard product-port mapping screen
*/
declare _query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_final_query text := '';
_agg_level_db text;
_agg_level text:= 'product_code';
_fl boolean:= false::boolean;
_key text;
_value text;
begin
   _agg_level_db:= global.fetch_aggregation_level();
if _agg_level_db is not null 
then
   _agg_level = _agg_level_db;
end
if;
for _key, _value in 
SELECT
   * 
FROM
   jsonb_each_text($3) 
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
   $3 = $3 || jsonb_build_object(_agg_level_db, jsonb_build_array());
end
if;
_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
_query_table_filters := "global".form_table_query($4);
_query_combine := 'SELECT * FROM (select
 pm.'||_agg_level||' as aggregation_code, pm.article, pm.product_name, pm.product_description,
pm.l1_name, pm.l2_name, pm.l3_name,
ppt.stylecolorcdescription, ppt.port_code, ppt.port_description, ppt.shippingmethod, COALESCE(ppt.is_eligible, false) as is_eligible
from
   (
      SELECT
         main.product_name,
         main.product_description,
         attributes.* 
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
   inner join
      "global".product_port_table ppt 
      on pm.article = ppt.article
      and ppt.feed_active = true
)
X ' || _query_table_filters;
 raise notice '%',
_query_combine;
if $5 is true 
then
   _final_query := 'select count(*) from (' || _query_combine || ') temp' ;
else
   _final_query := _query_combine;
end
if;
OPEN $1 FOR execute _final_query;
RETURN _query_combine;
end
$function$ ;

