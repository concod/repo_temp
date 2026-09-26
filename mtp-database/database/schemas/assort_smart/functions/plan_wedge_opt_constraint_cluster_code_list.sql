--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_constraint_cluster_code_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_constraint_cluster_code_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_wedge_opt_constraint_cluster_code_list(input integer, text);
CREATE OR REPLACE FUNCTION assort_smart.plan_wedge_opt_constraint_cluster_code_list(input integer, text)
 RETURNS TABLE(plan_wedge_opt_cons_id integer, plan_code integer, levels jsonb, type character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_wedge_opt_constraint_cluster_code_list
Created by: Hemant Kumar Singh
Created at: 13-Apr-2022
No of input parameter: 2
Parameter Description : $1,&2 = plan_code, store_type

Purpose: This function been created to get plan wedge opt constraint cluster details

Calling Statement:
SELECT assort_smart.plan_wedge_opt_constraint_cluster_code_list(107,'Full Line Retail');

Sadhana J: added into assort-smart
*/
declare
	_query_combine text;
	begin
		_query_combine := 'select
					plan_wedge_opt_cons_id, plan_code, levels, special_classification as type, attribute_value
					from
					assort_smart.plan_wedge_opt_constraint
				 	where plan_code  = ' || $1 ||' and special_classification =''' || $2 || '''
					order by plan_wedge_opt_cons_id,levels';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
