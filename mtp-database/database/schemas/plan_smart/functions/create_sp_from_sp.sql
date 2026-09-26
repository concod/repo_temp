--liquibase formatted sql
--changeset liquibase:create_sp_from_sp runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_sp_from_sp
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.create_sp_from_sp(p_from_plan_code integer, p_to_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.create_sp_from_sp(p_from_plan_code integer, p_to_plan_code integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_channel            text;
  v_classes            text;
  v_weeks              text;
  v_vw_ddl             text;
  v_insert_sql         text;
  v_return             bool := false;
  v_scenario_view_name text;
  v_from_partition     text:='plan_smart.plan_modifications_'||p_from_plan_code;
  v_to_partition       text:='plan_smart.plan_modifications_'||p_to_plan_code;
  v_kpi_str            text;
begin
 
  select 
    channel,
    l2_name,
    weeks
  into
    v_channel, 
    v_classes,
    v_weeks
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_from_plan_code
  and
    is_deleted = false;
  
  select
    string_agg('kpi'||kpino, ',') as kpi_str  
  into
    v_kpi_str
  from
    generate_series(1,250) kpino ;

  v_insert_sql := 
     'insert into '||v_to_partition||'
      select '||p_to_plan_code||' as plan_code,
            channel,
 			class,
 			current_week,
            hierarchy_code,'||
 			v_kpi_str||',
            ''SP''
     from '||v_from_partition;
  raise notice '%', v_insert_sql;
  perform plan_smart.populate_plan_filter_mappings(p_to_plan_code);
  perform plan_smart.create_plan_modification_partition(p_to_plan_code);
  execute v_insert_sql;
  v_return = true;
  return v_return;
end
$function$

;