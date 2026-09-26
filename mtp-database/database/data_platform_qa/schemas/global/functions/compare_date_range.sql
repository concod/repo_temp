--liquibase formatted sql
--changeset liquibase:compare_date_range runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for compare_date_range
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.compare_date_range(input integer, integer, integer);
CREATE OR REPLACE FUNCTION global.compare_date_range(input integer, integer, integer)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  min(y.date), 
  max(y.date), 
  min(y.fw_id), 
  max(y.fw_id) 
from 
  (
    select 
      * 
    from 
      global.fc_fy_fw_level 
    where 
      fw_id >= $2 
      and fw_id <= $3
  ) x 
  join (
    select 
      * 
    from 
      global.fc_fy_fw_level 
    where 
      fy = $1
  ) y on x.fw = y.fw;
end $function$
;
