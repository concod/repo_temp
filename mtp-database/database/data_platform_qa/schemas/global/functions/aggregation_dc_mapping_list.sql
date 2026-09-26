--liquibase formatted sql
--changeset liquibase:aggregation_dc_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_dc_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.aggregation_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.aggregation_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
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
declare 
_query_pm text := '';
_query_pa text := '';
_query_table_filters text := '';
_query_combine text;
_final_query text := '';
_aggr_level text;
begin
 _aggr_level := global.fetch_aggregation_level();
_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';
_query_table_filters := "global".form_table_query($4);
_query_combine := 'SELECT * FROM (select
 pm.*, --ps.channel,
pdm.dc_map 
from
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
   left join
      (
         select
            aggregation_code,
            json_agg(distinct jsonb_build_object(''dc_code'', dc.dc_code, ''name'', dc.name)) as dc_map 
         from
            "global".aggregation_mapping pdm 
            join
               "global".distribution_centres dc 
               on pdm.dc_code = dc.dc_code 
         where
            dc.is_active 
            and pdm.mapping_type = ''aggregation_dc'' 
         group by
            aggregation_code
      )
      pdm 
      on pm.aggregation_code = pdm.aggregation_code 		--left join (
      --select psm.product_code , jsonb_agg( distinct sa.channel) channel
      --from global.product_store_mapping psm join global.store_attributes_filter sa
      --on psm.store_code =sa.store_code
      --and sa.attribute_name =''channel''
      --group by psm.product_code) ps on pm.product_code = ps.product_code
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
$function$
;

