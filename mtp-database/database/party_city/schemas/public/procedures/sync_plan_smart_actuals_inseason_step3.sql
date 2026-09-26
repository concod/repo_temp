--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:public.sync_plan_smart_actuals_inseason_step3_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-39944
--comment:  adding audit columns 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_inseason_step3(IN p_channel text);
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_inseason_step3(IN p_channel text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
  declare
  v_sql_text                text;
  v_affected_rows           int;
  v_actual_refresh_min_week int;
  v_channel_part            text;
  v_cnt                     int := 0;
  i                         record;
  start_time                timestamp := clock_timestamp();
  end_time                  timestamp;
  duration                  interval; 
  log_desc                  text;
  v_user_code               int4;
 begin
  set work_mem = '2GB';
  set application_name = 'Non actualised KPI update in progress';
  
  select (attribute_value ->> 'value')
  into v_actual_refresh_min_week
  from global.default_attributes 
  where attribute_type  = 'actual_refresh_min_week';


  select user_code
    into v_user_code
    from "global".user_master 
   where name = 'dataingestion';

 
  for i in (select part_name
              from wf_parts
             where channel = p_channel
               and current_week >= v_actual_refresh_min_week
           )
  loop
	    v_sql_text := format('
        update
          plan_smart.%s wms
        set
          kpi62 = Coalesce(kpi157,0) +Coalesce(kpi161,0),-- Comp Receipt Cost
          kpi170 = Coalesce(kpi181,0) + Coalesce(kpi182,0),-- non comp rcpt cost
          kpi63 = Coalesce(kpi162,0) +Coalesce(kpi160,0),--total rcpt cost 
          kpi41 = Coalesce(kpi163,0) +Coalesce(kpi156,0),
          kpi171 = Coalesce(kpi184,0) + Coalesce(kpi183,0),
          kpi42 = Coalesce(kpi159,0) + Coalesce(kpi158,0),
          kpi56 =  (Coalesce(kpi157,0) +Coalesce(kpi161,0))/nullif((Coalesce(kpi163,0) +Coalesce(kpi156,0)),0) ,
          kpi169 = ((Coalesce(kpi181,0) + Coalesce(kpi182,0))/nullif((Coalesce(kpi184,0) + Coalesce(kpi183,0)),0)),
          kpi57 = ((Coalesce(kpi162,0) +Coalesce(kpi160,0))/nullif((Coalesce(kpi159,0) + Coalesce(kpi158,0)),0)),
          updated_by = ' || v_user_code || ', 
          updated_at =  ''' || NOW() || ''''
        ,i.part_name
        );
        raise notice 'v_update_sql: %', v_sql_text;
        execute v_sql_text;
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
  log_desc := 'Non actualised KPI update to WF for '||p_channel;
  insert into ingestion_logging values (current_date,log_desc,format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
end
$procedure$
;