--liquibase formatted sql
--changeset liquibase:aggregation_store_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_store_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.aggregation_store_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.aggregation_store_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

/*

calling statement :

select * from global.product_store_mapping_list('{}', 

'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [], "l2_name": [], "l3_name": [], "style": [], "color": [], "size": []}', 

'{"range": [], "sort": [], "search": [], "limit": {"page": 1, "limit": 10}}') 

*/

declare

_query_pm text := '';

_query_pa text := '';

_query_table_filters text := '';

_query_combine text;

_final_query text;

_aggr_level text;

begin

--select jsonb_object_agg(key, value) into $2 from (select * from jsonb_each_text($2) where key != 'active' union select 'active', '[{"type":"custom","operator":"=","values":"true"}]') x;

_aggr_level := global.fetch_aggregation_level();

_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));

_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);

_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';

_query_table_filters := "global".form_table_query($4);

_query_combine := '

SELECT

*

FROM (

SELECT

--psm.mapped_stores_count::int4,

pm.*

FROM (

SELECT

alf.*

FROM global.aggregation_level_filter alf

JOIN (' || _query_pa || ') attributes

ON

alf.aggregation_code = attributes.aggregation_code) pm

) X ' || _query_table_filters;

raise notice '%', _query_combine;

--RETURN QUERY execute _query_combine;

if $5 is false then

_final_query := _query_combine;

else

_final_query := 'select count(*) from (' || _query_combine || ') temp' ;

end if;

OPEN $1 FOR execute _final_query;

RETURN $1;

end

$function$
;

