--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:update_updated_at runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_updated_at
--rollback: SELECT 1

DROP FUNCTION IF EXISTS cortexeye_lite.update_updated_at();

CREATE OR REPLACE FUNCTION cortexeye_lite.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE TRIGGER trg_threads_updated_at BEFORE UPDATE
	ON cortexeye_lite.threads FOR EACH ROW EXECUTE FUNCTION cortexeye_lite.update_updated_at();

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE
	ON cortexeye_lite.conversations FOR EACH ROW EXECUTE FUNCTION cortexeye_lite.update_updated_at();