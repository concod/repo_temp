--liquibase formatted sql
--changeset liquibase:filter_configurations_mapping_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_configurations_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.filter_configurations_mapping_list(input integer);
CREATE OR REPLACE FUNCTION global.filter_configurations_mapping_list(input integer)
 RETURNS SETOF global.filter_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			*
		from
			"global".filter_configurations_mapping
		where
			fc_code = $1;
	end
	$function$
;


CREATE OR REPLACE FUNCTION global.filter_configurations_mapping_list(input integer, character varying)
 RETURNS SETOF global.filter_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			*
		from
			"global".filter_configurations_mapping
		where
			fc_code = $1
			and dimension = $2;
	end
	$function$
;
