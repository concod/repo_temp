--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:audit_trigger_function runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for audit_trigger_function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.audit_trigger_function() ;
CREATE OR REPLACE FUNCTION global.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   -- call global.build_list_partitions('mtp_audit_log');
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO global.mtp_audit_log (source_table, operation, user_id, new_data)
        VALUES (TG_TABLE_NAME, 'I', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO global.mtp_audit_log (source_table, operation, user_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'U', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO global.mtp_audit_log (source_table, operation, user_id, old_data)
        VALUES (TG_TABLE_NAME, 'D', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;
