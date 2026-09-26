--liquibase formatted sql
--changeset liquibase:fc_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fc_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fc_list(input integer);
CREATE OR REPLACE FUNCTION global.fc_list(input integer)
 RETURNS SETOF global.fulfilment_centres
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
	   SELECT * FROM "global".fulfilment_centres WHERE fc_code = $1 AND is_deleted = false;
	end
	$function$
;


CREATE OR REPLACE FUNCTION global.fc_list(refcursor, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_sa text := '';
	_query_combine text;
	_query_table_filters text := '';
	_final_query text := '';
	begin
		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'SELECT * FROM (
		select fc.* from (
						SELECT main.fc_code,main.name,main.lead_time,main.cost_per_km, attributes.* FROM (select fc.*, sm.store_code from (select *
		from
			"global".fulfilment_centres WHERE is_deleted = false and is_active =true ) fc join "global".store_master sm on fc.fc_code = sm.fc_code) main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) fc
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
			if $4 is false then 
                _final_query := _query_combine;
            else
            	_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
            end if;
            
			open $1 for execute _final_query;
			RETURN $1;
	end
	$function$
;
