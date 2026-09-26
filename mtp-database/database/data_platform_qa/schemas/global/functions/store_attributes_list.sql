--liquibase formatted sql
--changeset liquibase:store_attributes_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_attributes_list();
CREATE OR REPLACE FUNCTION global.store_attributes_list()
 RETURNS SETOF global.store_attributes_list
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
	   select
	   *
		from
			"global".store_attributes_list;
	end
	$function$
;
