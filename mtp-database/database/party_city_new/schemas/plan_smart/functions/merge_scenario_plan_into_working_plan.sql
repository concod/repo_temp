--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:merge_scenario_plan_into_working_plan_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39944
--comment: Create and persist Audit Trail of all PlanSmart Edit operations and link it to Plan Version tables
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.merge_scenario_plan_into_working_plan(p_plan_code integer);
DROP FUNCTION IF EXISTS plan_smart.merge_scenario_plan_into_working_plan(p_plan_code integer, p_user_code integer);
CREATE OR REPLACE FUNCTION plan_smart.merge_scenario_plan_into_working_plan(p_plan_code integer, p_user_code integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$ 
declare 
  i                   record;
  j                   record;
  v_plan_status       int4;
  v_plan_type         text;
  v_kpi_str_set       text;
  v_kpi_str_select    text;
  v_dml               text;
  v_drop_part_ddl     text;
  v_affected_rows     int4; 
  v_tot_affected_rows int4:=0;
  v_comment           text[];
begin
   -- v_drop_part_ddl := 'drop table if exists plan_smart.plan_modifications_'||p_sp_plan_code::text;
 
   -- Iterate over master table partitions to merge edits to scenario plan 
  select string_agg('kpi'||kpino||' = sp.kpi'||kpino, ' , ') as kpi_str_set ,
         string_agg('kpi'||kpino, ',') as kpi_str_select 
    into v_kpi_str_set,
         v_kpi_str_select
    from generate_series(1,250) kpino ; 
  
  select status, coalesce(plan_type,'SALES')
    into v_plan_status, v_plan_type
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice 'plan_status %',v_plan_status;
  
  for i in (select distinct plan_table
              from plan_smart.query_source_mappings
             where plan_status = v_plan_status
               and plan_type   = v_plan_type
           )
  loop
    for j in (select distinct i.plan_table||'_'||
                              lower(regexp_replace(channel, '[ /.-]', '', 'g'))||'_'||
                              current_week::text as part_name
                 from plan_smart.plan_modifications
                where plan_code = p_plan_code
              )
    loop
      v_dml := 'update '||j.part_name||' 
                   set '||v_kpi_str_set
                        ||',updated_by='||p_user_code
                        ||',updated_at = '''||now()||'''
                 from  (
                        select channel,class, current_week, hierarchy_code,'||v_kpi_str_select||'
                          from plan_smart.plan_modifications 
                         where plan_code='||p_plan_code||'
                       ) sp
                  where '||j.part_name||'.channel        = sp.channel 
                    and '||j.part_name||'.class          = sp.class
                    and '||j.part_name||'.hierarchy_code = sp.hierarchy_code 
                    and '||j.part_name||'.current_week   = sp.current_week';
      raise notice '%', v_dml;
      v_comment := v_comment||v_dml;
      execute v_dml;
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
      v_tot_affected_rows := v_tot_affected_rows + v_affected_rows; 
    end loop;
  end loop;
 
  insert into plan_smart.plan_master_audit
        (plan_code
        ,action_code
        ,user_code
        ,plan_actioned_ts
        ,"comment"
        )
  values
        (p_plan_code
        ,'merge_'||case when v_plan_status = 2 then 'sp'
                        when v_plan_status = 3 then 'sf'
                   end
         ||'_to_'||
                  case when v_plan_status = 2 then 'wp'
                       when v_plan_status = 3 then 'wf'
                  end
        ,p_user_code
        ,now()
        ,v_comment
        );
  RETURN v_tot_affected_rows;
end 
$function$
;
