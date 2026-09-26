--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_info runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for plan_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_info(input refcursor, integer);
CREATE OR REPLACE FUNCTION assort_smart.plan_info(input refcursor, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
     declare
        _pm_input jsonb;
        _pa_input jsonb;
    begin
	    _pm_input := '{"plan_code": [{"type":"list","operator":"in","values":[' || $2 || ']}]}';
	    _pa_input := "assort_smart".form_attributes_list('{"plan_code": 26}', 'plan_attributes');
	   select * from assort_smart.plan_assort_list($1, _pm_input, _pa_input, '{}') into $1;
         RETURN $1;
    end $function$
;
