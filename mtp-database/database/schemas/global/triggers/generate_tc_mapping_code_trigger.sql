--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:generate_tc_mapping_code_trigger runOnChange:true stripComments:false splitStatements:false context:MTP-30879 labels:generate_tc_mapping_code_trigger
--comment: initial changeset for generate_tc_mapping_code_trigger
--rollback: SELECT 1
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
CREATE OR REPLACE TRIGGER generate_tc_mapping_code_trigger
BEFORE INSERT
    on
    global.table_configurations_mapping for each row execute function global.generate_tc_mapping_code();