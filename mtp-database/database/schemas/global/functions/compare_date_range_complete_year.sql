--liquibase formatted sql
--changeset liquibase:compare_date_range_complete_year runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for compare_date_range_complete_year
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.compare_date_range_complete_year(input integer);
CREATE OR REPLACE FUNCTION global.compare_date_range_complete_year(input integer)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  min(date), 
  max(date), 
  min(fw_id), 
  max(fw_id) 
from 
  global.fc_fy_fw_level 
where 
  fy = $1;
end $function$
;
