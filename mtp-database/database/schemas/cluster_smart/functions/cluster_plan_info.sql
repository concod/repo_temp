--liquibase formatted sql
--changeset liquibase:cluster_plan_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cluster_plan_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_plan_info(input refcursor, integer);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_plan_info(input refcursor, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare 
    	_pm_input jsonb;
       	_pa_input jsonb;
    begin
	    _pm_input := '{"cluster_plan_code": [{"type":"list","operator":"in","values":[' || $2 || ']}]}';
	    _pa_input := "cluster_smart".form_attributes_list('{"cluster_plan_code": 26}', 'cluster_plan_attributes');
	   select * from cluster_smart.plan_cluster_list($1, _pm_input, _pa_input, '{}') into $1;
         RETURN $1; 
    end $function$
;
