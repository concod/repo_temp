--liquibase formatted sql
--changeset liquibase:plan_info_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_info_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_info(input refcursor, integer);
CREATE OR REPLACE FUNCTION assort.plan_info(input refcursor, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare 
    	_pm_input jsonb;
       	_pa_input jsonb;
    begin
	    _pm_input := '{"plan_code": [{"type":"list","operator":"in","values":[' || $2 || ']}]}';
	    _pa_input := "assort".form_attributes_list('{"plan_code": 26}', 'plan_attributes');
	   select * from assort.plan_assort_list($1, _pm_input, _pa_input, '{}') into $1;
         RETURN $1; 
    end $function$

;