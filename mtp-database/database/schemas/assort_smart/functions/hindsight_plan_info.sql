--liquibase formatted sql
--changeset liquibase:hindsight_plan_info  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for hindsight_plan_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.hindsight_plan_info(input refcursor, integer);

CREATE OR REPLACE FUNCTION assort_smart.hindsight_plan_info(input refcursor, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
     declare
        _pm_input jsonb;
        _pa_input jsonb;
    begin
	    _pm_input := '{"hindsight_plan_code": [{"type":"list","operator":"in","values":[' || $2 || ']}]}';
	    _pa_input := "assort_smart".form_attributes_list('{"hindsight_plan_code": 26}', 'hindsight_plan_attributes');
	   select * from assort_smart.hindsight_plan_list($1, _pm_input, _pa_input, '{}') into $1;
         RETURN $1;
    end $function$
;