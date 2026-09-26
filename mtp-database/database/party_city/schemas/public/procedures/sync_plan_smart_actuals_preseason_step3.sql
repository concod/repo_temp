--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:public.sync_plan_smart_actuals_preseason_step3_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38111
--comment:  adding audit columns
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_preseason_step3(IN p_channel text);
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_preseason_step3(IN p_channel text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
  declare
  v_cls1                    text;
  v_cls2                    text;
  v_cls3                    text;
  v_cls4                    text;
  v_sql_text                text;
  v_constraint_sql          text;
  v_const_tbl_name          text;
  v_constraint_name         text; 
  v_affected_rows           int;
  v_actual_refresh_min_week int;
  v_channel_part            text;
  v_cnt                     int := 0;
  i                         record;
  j                         record;
  v_channel_part_wf         text;
  v_channel_part_wp         text;
  start_time                timestamp := clock_timestamp();
  end_time                  timestamp;
  duration                  interval;
  log_desc                  text;
  v_user_code               int4;
 begin
  set work_mem = '2GB';
  set application_name = 'Preseaon actualisation update3 in progress';
  v_sql_text := 'create table if not exists ingestion_logging (run_date date, step text, comment text)';	 
  execute v_sql_text;
 
 
 
  select (attribute_value ->> 'value')
  into v_actual_refresh_min_week
  from global.default_attributes 
  where attribute_type  = 'actual_refresh_min_week';
 
  select user_code
    into v_user_code
    from "global".user_master 
   where name = 'dataingestion';
 
  for i in (select * from wp_parts wp where channel = p_channel)
      loop 
	    v_sql_text := format('
        update
          %s wps
        set
          kpi163 = Coalesce(kpi41,0) -  Coalesce(wps.kpi156,0),
          kpi183 = Coalesce(kpi171,0) - Coalesce(wps.kpi184,0),
          kpi159 = (Coalesce(kpi41,0) - Coalesce(wps.kpi156,0))+ (Coalesce(kpi171,0) - Coalesce(wps.kpi184,0)),
          kpi161 = Coalesce(kpi62,0) -  Coalesce(wps.kpi157,0),
          kpi181 = Coalesce(kpi170,0) - Coalesce(wps.kpi182,0),
          kpi162 = (Coalesce(kpi62,0) - Coalesce(wps.kpi157,0)) + (Coalesce(kpi170,0) - Coalesce(wps.kpi182,0)) ,
          kpi172 = ((Coalesce(kpi62,0) - Coalesce(wps.kpi157,0))/nullif((Coalesce(kpi41,0)  - Coalesce(wps.kpi156,0)),0)),
          kpi174 = ((Coalesce(kpi170,0) - Coalesce(wps.kpi182,0))/nullif((Coalesce(kpi171,0) - Coalesce(wps.kpi184,0)),0)),
          kpi176 = ((Coalesce(kpi62,0) - Coalesce(wps.kpi157,0) + (Coalesce(kpi170,0) - Coalesce(wps.kpi182,0))) / nullif((Coalesce(kpi41,0) - Coalesce(wps.kpi156,0) + (Coalesce(kpi171,0) - Coalesce(wps.kpi184,0))),0)),
          updated_by = ' || v_user_code || ', 
          updated_at =  ''' || NOW() || '''  '   
         ,'plan_smart.'||i.part_name);
    
      raise notice 'v_update_sql: %', v_sql_text;
      execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
 
  insert into plan_smart.plan_master_audit
        (plan_code
        ,action_code
        ,user_code
        ,plan_actioned_ts
        ,"comment"
        )
      values

        (0
        ,'dataingestion'
        ,v_user_code
        ,NOW()
        ,v_sql_text
        );     
   
 
  end_time := clock_timestamp();
  duration := end_time - start_time;
  log_desc := 'Preseaon actualisation update3 for '||p_channel;
  insert into ingestion_logging values (current_date,log_desc,format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
end
$procedure$
;