--liquibase formatted sql
--changeset liquibase:fc_dc_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fc_dc_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fc_dc_mapping_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.fc_dc_mapping_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(fc_code integer, name character varying, region character varying, dc_map json, store_code character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $1));
 		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'SELECT * FROM (select
			fc.fc_code,
fc.name,
fc.region,
 sdm.dc_map,
fc.store_code
 from (
select
	main.*,
	region
from
	(
	select
		fc.fc_code,
				fc.name,
				sm.store_code,
				sm.store_name
	from
		"global".fulfilment_centres fc
	join "global".store_master sm on
		fc.fc_code = sm.fc_code
where COALESCE(fc.is_deleted,false) = false
) main
join (' || _query_sa || ') attributes on
	main.store_code = attributes.store_code
) fc
		left join (
select fc_code, json_agg(jsonb_build_object(''dc_code'', dc.dc_code, ''name'', dc.name)) as dc_map from "global".dc_fc_mapping sdm
join "global".distribution_centres dc on sdm.dc_code = dc.dc_code
group by fc_code) sdm on fc.fc_code = sdm.fc_code
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
RETURN QUERY execute _query_combine;
 	end
$function$
;