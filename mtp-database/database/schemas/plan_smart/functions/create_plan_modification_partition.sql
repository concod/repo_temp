--liquibase formatted sql
--changeset liquibase:create_plan_modification_partition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_plan_modification_partition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.create_plan_modification_partition(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.create_plan_modification_partition(p_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 declare
  v_sql text;
 begin
  v_sql = 'CREATE TABLE IF NOT EXISTS
       plan_smart.plan_modifications_'||p_plan_code||' PARTITION OF plan_smart.plan_modifications FOR
       VALUES
       IN ('||p_plan_code||');';
  execute v_sql;
 end
 $function$

;