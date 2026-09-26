--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:global.generate_tc_mapping_code() runOnChange:true stripComments:false splitStatements:false context:notify-using-pgnotify labels:tc_code
--comment: New notifications trigger
--rollback: SELECT 1
--DROP FUNCTION IF EXISTS global.generate_tc_mapping_code();
CREATE OR REPLACE FUNCTION global.generate_tc_mapping_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.tc_mapping_code IS NULL OR NEW.tc_mapping_code = '' THEN
        NEW.tc_mapping_code := NEW.tc_code || '_' || NEW.column_name || '_' || NEW.label || '_' || NEW.dimension;
    END IF;
    RETURN NEW;
END;
$function$
;

--changeset jaya.kahndelwal@impactanalytics.co:table_configurations_mapping_v1 stripComments:false splitStatements:false context:Release_1_1 labels:tc_code
--comment: creating trigger on insert 
CREATE OR REPLACE TRIGGER  generate_tc_mapping_code_trigger before
insert
    on
    global.table_configurations_mapping for each row execute function global.generate_tc_mapping_code();