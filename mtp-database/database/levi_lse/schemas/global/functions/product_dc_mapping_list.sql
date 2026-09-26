--liquibase formatted sql
--changeset liquibase:product_dc_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Optimized query with LATERAL join for dc_map
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.product_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$ 
/*
Updated_by Updated_on Purpose
---------- ----------- --------
Kailash Yadav 24-May-2022 added refcursor as return table to avoid the restriction of limited attributes
Pradeep Nayak 07-Sept-2022 Removed fetching of channel attribute ( which saved the join of store product mapping also)
Calling Statement: 
select * from global.product_dc_mapping_list('abc','{}', 
'{"l0_name": [], "l1_name": [], "l2_name": [], "l3_name": [], "style": [], "color": [], "size": [], "style_group": []}',
'{"search": [], "sort": [], "range": []}')
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

-- Optimized query with LATERAL join for dc_map
_query_combine := format($$
    WITH pm AS (
        SELECT main.product_name, main.product_description, attributes.*
        FROM (%s) main
        JOIN (%s) attributes ON main.product_code = attributes.product_code
    )
    SELECT
        pm.article AS aggregation_code,
        pm.*,
        dcm.dc_map
    FROM pm
    LEFT JOIN LATERAL (
        SELECT json_agg(jsonb_build_object('dc_code', dc.dc_code, 'name', dc.name)) AS dc_map
        FROM global.product_dc_mapping pdm
        JOIN global.distribution_centres dc ON pdm.dc_code = dc.dc_code
        WHERE pdm.product_code = pm.product_code
    ) dcm ON TRUE
	%s
$$, _query_pm, _query_pa, _query_table_filters);

raise notice '%', _query_combine;
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
$function$
;
