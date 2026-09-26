--liquibase formatted sql
--changeset liquibase:get_plan_launch_list runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for get_plan_launch_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_plan_launch_list(input integer);
CREATE OR REPLACE FUNCTION assort_smart.get_plan_launch_list(input integer)
 RETURNS TABLE(attribute_list character varying[])
 LANGUAGE plpgsql
AS $function$
  	/*
  Function/Procedure name: assort_smart.get_plan_launch_list
  Created by: Hemant Kumar Singh
  Created at: 10-Mar-2022
  No of input parameter: 1
  Parameter Description : $1 = Plan code 
  
  Purpose: This function been created to getting drop list for plan_attributes 
  
  Calling Statement:
  SELECT assort_smart.get_plan_launch_list('30');
  
  Hemant Kumar SIngh:getting only drop list 
  */
  	begin
  		RETURN QUERY SELECT
  		  ARRAY_AGG(DISTINCT attribute_name) attribute_list
  		FROM
  		  assort_smart.plan_attributes
  		WHERE
  		  plan_code = $1
  		  AND attribute_name ILIKE 'launch%'
  		  AND attribute_name != 'launch_count';
   	end
  $function$
;
