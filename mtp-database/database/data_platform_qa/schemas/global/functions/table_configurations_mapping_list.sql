--liquibase formatted sql
--changeset liquibase:table_configurations_mapping_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_configurations_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.table_configurations_mapping_list(input integer);
CREATE OR REPLACE FUNCTION global.table_configurations_mapping_list(input integer)
 RETURNS SETOF global.table_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			*
		from
			"global".table_configurations_mapping
		where
			tc_code = $1;
	end
	$function$
;
