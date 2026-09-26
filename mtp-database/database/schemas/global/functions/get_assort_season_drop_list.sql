--liquibase formatted sql
--changeset liquibase:get_assort_season_drop_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_assort_season_drop_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_assort_season_drop_list(input text);
CREATE OR REPLACE FUNCTION global.get_assort_season_drop_list(input text)
 RETURNS TABLE(attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$

	/*
Function/Procedure name: assort.get_assort_season_drop_list
Created by: Hemant Kumar Singh
Created at: 28-Apr-2022
No of input parameter: 1
Parameter Description : $1 =  'assort_season_value'

Purpose: This function been created to getting from season and drop values 

Calling Statement:

SELECT assort.get_assort_season_drop_list('assort_season_value');


Hemant Kumar SIngh:getting season and drop values from  global.tenant_attribute_master
*/

declare
	_query_combine text;
	begin
		_query_combine := 'SELECT  attribute_value::jsonb attribute_value
								FROM "global".tenant_attribute_master
							 	where "name"  = ''' || $1 || '''
					';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
