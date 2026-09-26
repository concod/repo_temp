--liquibase formatted sql
--changeset liquibase:product_fc_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_fc_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_fc_mapping_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_fc_mapping_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := 'SELECT * FROM (select
			pm.*,
 pfm.fc_map from (SELECT main.product_name, main.product_description, attributes.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code where main.active) pm
		left join (
select product_code, json_agg(jsonb_build_object(''fc_code'', fc.fc_code, ''name'', fc.name)) as fc_map from "global".product_fc_mapping pfm
join "global".fulfilment_centres fc on pfm.fc_code = fc.fc_code 
group by product_code) pfm on pm.product_code = pfm.product_code 
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		OPEN $1 FOR execute _query_combine;
	RETURN $1;
 	end
$function$
;
