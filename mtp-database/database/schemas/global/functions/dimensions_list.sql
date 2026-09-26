--liquibase formatted sql
--changeset liquibase:dimensions_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimensions_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.dimensions_list();
CREATE OR REPLACE FUNCTION global.dimensions_list()
 RETURNS SETOF global.dimensions
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
	   select
	   *
		from
			"global".dimensions;
	end
	$function$
;
