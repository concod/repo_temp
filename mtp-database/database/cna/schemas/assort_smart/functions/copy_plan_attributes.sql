--liquibase formatted sql
--changeset chitrakumari.singh@impactanalytics.co liquibase:copy_plan_attributes  runOnChange:true stripComments:false splitStatements:false context:new_table_for_drop_config labels:liquibase_project_start
--comment: Add new table drop config for IA recommend plan
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_attributes(new_plan_code integer, existing_plan_code integer);


CREATE OR REPLACE FUNCTION assort_smart.copy_plan_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    insert into "assort_smart".plan_attributes (plan_code, attribute_name, attribute_value) (select $1, attribute_name , attribute_value from "assort_smart".plan_attributes where plan_code = $2);
end;
$function$
;

