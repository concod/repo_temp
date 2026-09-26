
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co liquibase:copy_step_records_mapping runOnChange:true  stripComments:false splitStatements:false context:new_table_for_drop_config labels:liquibase_project_start
--comment: Add new table drop config for IA recommend plan
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_step_records_mapping(new_plan_code integer, existing_plan_code integer);

CREATE OR REPLACE FUNCTION assort_smart.copy_step_records_mapping(new_plan_code integer, existing_plan_code integer)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert new records with new_plan_code as the record_id
    INSERT INTO "assort_smart".step_records_mapping(record_id, step, sub_steps)
    SELECT $1, step, sub_steps
    FROM "assort_smart".step_records_mapping
    WHERE record_id = $2
    ON CONFLICT DO NOTHING; 
END;
$function$
;
