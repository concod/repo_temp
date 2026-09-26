--liquibase formatted sql
--changeset liquibase:get_fys runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_fys
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_fys();
CREATE OR REPLACE FUNCTION global.get_fys()
 RETURNS TABLE(fy_id integer)
 LANGUAGE plpgsql
AS $function$ begin return QUERY 
select 
  fy 
from 
  global.fc_fy_fw_level 
group by 
  1 
order by 
  1;
end $function$
;
