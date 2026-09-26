--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_audit_filter_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_audit_filter_config

DROP FUNCTION if exists config_schema.fn_audit_filter_config;

CREATE OR REPLACE FUNCTION config_schema.fn_audit_filter_config()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO config_schema.tb_screen_filter_config_map_history(original_id, operation, old_data)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO config_schema.tb_screen_filter_config_map_history(original_id, operation, old_data, new_data)
        VALUES (OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$
;