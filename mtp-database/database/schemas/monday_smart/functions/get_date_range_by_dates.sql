
--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_date_range_by_dates_create runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: get_date_range_by_dates_create
--rollback: SELECT 1

DROP FUNCTION IF EXISTS monday_smart.get_date_range_by_dates(date, date);

CREATE FUNCTION monday_smart.get_date_range_by_dates(input date, date)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  min(date), 
  max(date), 
  min(fw_id), 
  max(fw_id) 
from 
  monday_smart.fc_fy_fw_level_v2 x 
where 
  date >= $1 
  and date <= $2;
end $function$
;
