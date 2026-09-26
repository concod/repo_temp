--liquibase formatted sql
--changeset liquibase:dynamic_ddl_for_replication runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dynamic_ddl_replication
--rollback: SELECT 1
DROP TRIGGER IF EXISTS dynamic_ddl_replication ON "global".dynamic_ddl_for_replication;
DROP FUNCTION IF EXISTS global.execute_dynamic_ddl_for_replication();
/*
CREATE OR REPLACE FUNCTION global.execute_dynamic_ddl_for_replication()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $function$
BEGIN
    EXECUTE NEW.dynamic_def;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER dynamic_ddl_replication
    BEFORE INSERT OR UPDATE
    ON "global".dynamic_ddl_for_replication
    FOR EACH ROW
    EXECUTE FUNCTION "global".execute_dynamic_ddl_for_replication();
*/
