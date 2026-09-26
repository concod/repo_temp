--liquibase formatted sql
--changeset mayank.dubey@impactanalytics.co:store_dc_mapping_list runOnChange:true stripComments:false splitStatements:false context:MTP-47022 labels:MTP-47022,MTP-MTP-102319
--comment: MTP-69490
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_dc_transit_time_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.store_dc_transit_time_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_final_query text := '';
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code,region,climate,s4_name,district,s3_name,s1_name', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := 'SELECT * FROM (select
			sm.*, sdm.dc_code, sdm.name as dc_name, sdm.dc_rank, sdm.transit_time_og, sdm.transit_time as lead_time, sdm.processing_time, sdm.mapping_code, CONCAT(sdm.dc_code, ''|'', sm.store_code) as unique_key, sdm.updated_at, sdm.user_name, (case sdm.linked_store_code when ''158900000'' then true when ''10034986'' then true else false end) "isDisabled" from (SELECT main.store_name, main.store_description, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
		join (
select store_code, dc.dc_code, dc.name, dc.linked_store_code, dttm.dc_rank,dttm.transit_time,dttm.transit_time_og,dttm.processing_time,sdm.mapping_code,to_char(dttm.updated_at at time zone '''|| inventory_smart.get_tenant_timezone() ||''', ''dd-mm-yyyy hh24:mi:ss'') as updated_at,um.user_name from "global".store_dc_mapping sdm
join "global".distribution_centres dc on sdm.dc_code = dc.dc_code
left join "inventory_smart".dc_transit_time_mapping dttm on sdm.mapping_code = dttm.mapping_code
left join "global".user_master um on dttm.updated_by = um.user_code
group by 1,2,3,4,5,6,7,8,9,10,11) sdm on sm.store_code = sdm.store_code 
order by store_code
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		if $5 is false then 
			_final_query := _query_combine;
		else
			_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
		end if;
		
		open $1 for execute _final_query;
		RETURN _query_combine;
	end
$function$
;