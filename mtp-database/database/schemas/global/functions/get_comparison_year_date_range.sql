--liquibase formatted sql
--changeset liquibase:get_comparison_year_date_range runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_comparison_year_date_range
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_comparison_year_date_range(input integer, integer, integer, integer, integer, integer);
CREATE OR REPLACE FUNCTION global.get_comparison_year_date_range(input integer, integer, integer, integer, integer, integer)
 RETURNS TABLE(final_data jsonb)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  jsonb_build_object(
    'cy', 
    jsonb_build_object(
      'start_date', 
      min(fw_start_date), 
      'end_date', 
      max(fw_end_date), 
      'start_week_id', 
      min(fw_id), 
      'end_week_id', 
      max(fw_id)
    )
  ) date_range 
from 
  global.fc_fy_fw_level 
where 
  fy in ($1, $2) 
union 
select 
  jsonb_build_object(
    'ly', 
    jsonb_build_object(
      'start_date', 
      min(fw_start_date), 
      'end_date', 
      max(fw_end_date), 
      'start_week_id', 
      min(fw_id), 
      'end_week_id', 
      max(fw_id)
    )
  ) date_range 
from 
  global.fc_fy_fw_level 
where 
  fy in ($3, $4) 
union 
select 
  jsonb_build_object(
    'lly', 
    jsonb_build_object(
      'start_date', 
      min(fw_start_date), 
      'end_date', 
      max(fw_end_date), 
      'start_week_id', 
      min(fw_id), 
      'end_week_id', 
      max(fw_id)
    )
  ) date_range 
from 
  global.fc_fy_fw_level 
where 
  fy in ($5, $6);
end $function$
;
