--liquibase formatted sql
--changeset liquibase:get_date_range_by_dates runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_date_range_by_dates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_date_range_by_dates(input date, date);
CREATE OR REPLACE FUNCTION global.get_date_range_by_dates(input date, date)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  min(fw_start_date), 
  max(fw_end_date), 
  min(fw_id), 
  max(fw_id) 
from 
  global.fc_fy_fw_level x 
where 
  date >= $1 
  and date <= $2;
end $function$
;
