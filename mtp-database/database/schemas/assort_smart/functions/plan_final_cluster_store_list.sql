--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:plan_final_cluster_store_list liquibase:plan_final_cluster_store_list runOnChange:true stripComments:false splitStatements:false context:MTP-21888  labels:liquibase_project_start
--comment: initial changeset for plan_final_cluster_store_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_final_cluster_store_list(input integer);
CREATE OR REPLACE FUNCTION assort_smart.plan_final_cluster_store_list(input integer)
 RETURNS TABLE(store_code character varying)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.plan_final_cluster_store_list
Created by: Mohammed Ayaz
Created at: 7-Jan-2023
Update at: 7-Jan-2023
No of input parameter: 1
Parameter Description : $1, plan_code int

Purpose: This function been created to get final_cluster_store_list with plance for plan-review-screen

returns:
 plan_code if exits

Calling Statement:
SELECT * from assort_smart.plan_final_cluster_store_list(12);

Mohammed Ayaz:
*/
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT pcsf.attribute_value as store_code
							FROM cluster_smart.plan_cluster_final pcf 
							join cluster_smart.plan_cluster_store_final pcsf 
							on pcf.cluster_code_id = pcsf.cluster_code_id 
							where cluster_plan_code in ( SELECT attribute_value::int4 FROM assort_smart.plan_attributes 
							where plan_code = ' || $1 ||' and attribute_name =''cluster_plan_code'')
							and pcsf.attribute_name = ''store_code''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
