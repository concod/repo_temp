--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:public.sync_plan_smart_actuals_preseason_step1_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-39944
--comment:  adding audit columns
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_preseason_step1();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_preseason_step1()
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
  v_user_code               int4;
 begin 
  set work_mem = '2GB';
  set application_name = 'Preseaon actualisation update1 in progress';
 
  select (attribute_value ->> 'value')
  into v_actual_refresh_min_week
  from global.default_attributes 
  where attribute_type  = 'actual_refresh_min_week';
 
  select user_code
    into v_user_code
    from "global".user_master 
   where name = 'dataingestion';
  
  for i in  ( select 
               channel,current_week
              from 
                public.po_oo_iter
              where 
                current_week <= v_actual_refresh_min_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
 
	v_sql_text := format('
    update
      %s wps
    set
      kpi156 = 0,
      kpi184 = 0,
      kpi158 = 0, 
      kpi157 = 0,
      kpi182 = 0,
      kpi160 = 0,
      kpi173 = 0,
      kpi175 = 0,
      kpi177 = 0,
      updated_by = ' || v_user_code || ', 
      updated_at =  ''' || NOW() || '''  '   
	, 'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
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
  insert into ingestion_logging values (current_date,'Preseaon actualisation update1',format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
end
$procedure$
;