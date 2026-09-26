--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_refresh_entity_status_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_refresh_entity_status_v1


DROP FUNCTION IF EXISTS base_pricing.fn_update_refresh_entity_status(int4, varchar, text, jsonb);

CREATE OR REPLACE FUNCTION base_pricing.fn_update_refresh_entity_status(p_history_id integer, p_status character varying, p_error_message text DEFAULT NULL::text, p_metrics jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE base_pricing.bp_refresh_entity_history
    SET
        end_time = NOW(),
        status = p_status,
        error_message = p_error_message,
        metrics = COALESCE(p_metrics, metrics),
        updated_at = NOW()
    WHERE history_id = p_history_id;
END;
$function$
;
