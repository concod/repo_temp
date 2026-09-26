--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_refresh_task_status_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_refresh_task_status_v1


DROP FUNCTION IF EXISTS base_pricing.fn_update_refresh_task_status(int4, varchar, text);

CREATE OR REPLACE FUNCTION base_pricing.fn_update_refresh_task_status(p_task_id integer, p_status character varying, p_error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE base_pricing.bp_refresh_task_history
    SET
        end_time = NOW(),
        status = p_status,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE task_id = p_task_id;
END;
$function$
;
