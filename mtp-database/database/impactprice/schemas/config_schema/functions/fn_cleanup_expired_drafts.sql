--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_cleanup_expired_drafts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_cleanup_expired_drafts

DROP FUNCTION if exists config_schema.fn_cleanup_expired_drafts;

CREATE OR REPLACE FUNCTION config_schema.fn_cleanup_expired_drafts()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM config_schema.tb_configuration_drafts
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$
;