--liquibase formatted sql
--changeset liquibase:get_screen_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_screen_configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_screen_configuration(input text, text, text);
CREATE OR REPLACE FUNCTION global.get_screen_configuration(input text, text, text)
 RETURNS TABLE(display_levels text)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: global.get_screen_configuration
Created by: Hemant Kumar Singh
Created at: 31-jan-2023
No of input parameter: 3
Parameter Description : $1 = name, $2= attribute_value key , $3 = attribute_value key 

Purpose: This function been created to getting screen configuration

Calling Statement:
SELECT "global".get_screen_configuration('assort_smart_screen_configuration','2.1','budget_optimization_level');

Hemant Kumar SIngh: getting screen configuration details
*/
declare
	_query_combine text;
	begin
		_query_combine := 'select attribute_value->''' || $2 ||'''->>''' || $3 ||''' as display_levels
        					from global.tenant_attribute_master
							where name  = ''' || $1 ||'''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
