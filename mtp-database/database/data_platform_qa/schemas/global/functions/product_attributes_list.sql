--liquibase formatted sql
--changeset liquibase:product_attributes_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_attributes_list();
CREATE OR REPLACE FUNCTION global.product_attributes_list()
 RETURNS SETOF global.product_attributes_list
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
	   select
	   *
		from
			"global".product_attributes_list;
	end
	$function$
;
