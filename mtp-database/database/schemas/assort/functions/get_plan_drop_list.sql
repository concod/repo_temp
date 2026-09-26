--liquibase formatted sql
--changeset liquibase:get_plan_drop_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_plan_drop_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_drop_list(input integer);
CREATE OR REPLACE FUNCTION assort.get_plan_drop_list(input integer)
 RETURNS TABLE(attribute_list character varying[])
 LANGUAGE plpgsql
AS $function$
	/*
Function/Procedure name: assort.get_plan_drop_list
Created by: Hemant Kumar Singh
Created at: 10-Mar-2022
No of input parameter: 1
Parameter Description : $1 = Plan code 

Purpose: This function been created to getting drop list for plan_attributes 

Calling Statement:
SELECT assort.get_plan_drop_list('30');

Hemant Kumar SIngh:getting only drop list 
*/
	begin
		RETURN QUERY SELECT
		  ARRAY_AGG(DISTINCT attribute_name) attribute_list
		FROM
		  assort.plan_attributes
		WHERE
		  plan_code = $1
		  AND attribute_name ILIKE 'drop%'
		  AND attribute_name != 'drops_count';
 	end
$function$;
