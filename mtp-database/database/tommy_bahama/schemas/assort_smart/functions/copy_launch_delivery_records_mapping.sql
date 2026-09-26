
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co liquibase:copy_launch_delivery_records_mapping runOnChange:true stripComments:false splitStatements:false context:new_table_for_drop_config labels:liquibase_project_start
--comment: Add new table drop config for IA recommend plan
--rollback: SELECT 1

 DROP FUNCTION IF EXISTS assort_smart.copy_launch_delivery_records_mapping(new_record_id integer, existing_record_id integer);

CREATE OR REPLACE FUNCTION assort_smart.copy_launch_delivery_records_mapping(new_record_id integer, existing_record_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert into the table with new_record_id and existing records' data
    INSERT INTO "assort_smart".launch_delivery_records_mapping (
        record_id, launch, launch_start_date, launch_end_date, 
        delivery, delivery_start_date, delivery_end_date
    )
    SELECT 
        $1, 
        launch, 
        launch_start_date, 
        launch_end_date, 
        delivery, 
        delivery_start_date, 
        delivery_end_date
    FROM "assort_smart".launch_delivery_records_mapping
    WHERE record_id = $2;
END;
$function$
;
