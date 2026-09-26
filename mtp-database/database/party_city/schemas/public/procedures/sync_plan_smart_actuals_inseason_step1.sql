--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:public.sync_plan_smart_actuals_inseason_step1_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-39944
--comment: adding audit columns in sync_plan_smart_actuals_inseason_step1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_inseason_step1();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_inseason_step1()
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
  v_actioned_ts             timestamptz := now();
  v_user_code               int4;
 begin  
  set work_mem = '2GB';
  set application_name = 'Upsert from actuals in progress';
 
  select user_code
    into v_user_code
    from "global".user_master 
   where name = 'dataingestion';
  
  select 
    'channel,class,compared_week,hierarchy_code,'||string_agg(kpi,',') as cls1 ,
    'channel,class,current_week,hierarchy_code,'||string_agg(plan_tbl_col_name,',') as cls2,
    string_agg(plan_tbl_col_name||' = excluded.'||plan_tbl_col_name, ',') as cls3,
    string_agg(plan_tbl_col_name||' = act.'||kpi, ',') as cls4
  into 
    v_cls1, 
    v_cls2, 
    v_cls3, 
    v_cls4
  from 
    plan_smart.app_metrics_config amc 
  inner join 
    (select column_name 
       from information_schema.columns
      where table_catalog = current_database()
        and table_schema = 'public'
        and table_name = 'actual_ly_temp'
        and column_name not in ('l0_name','l1_name','l3_name','compared_week','l3_name_channel')
    ) cols
  on 
   amc.kpi = cols.column_name ;
  
 
  for i in (select channel,current_week
              from public.actual_ly_temp
          group by channel,current_week
          order by channel,current_week)
  loop
	v_channel_part := regexp_replace(i.channel, '[ /.-]', '', 'g');
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    
    v_sql_text :=format(
    'insert into 
       %s(%s,%s)
     select %s , %L, %L
       from public.actual_ly_temp
     where 
       channel = %L
     and
       current_week = %s
     on conflict ON CONSTRAINT %s do update 
     set %s,  updated_by = %L, updated_at = %L;'
     ,'plan_smart.wf_master_1_'||v_channel_part||'_'||i.current_week::text
     ,v_cls2
     ,'created_by,created_at'
     ,v_cls1
     ,v_user_code
     ,v_actioned_ts
     ,i.channel
     ,i.current_week
     ,'wf_master_1_'||v_channel_part||'_'||i.current_week::text||'_pkey'
     ,v_cls3
     ,v_user_code
     ,v_actioned_ts
    );
    raise notice 'v_sql_text : %', v_sql_text;
    execute v_sql_text;

  end loop;
 
  raise notice 'Working forecast updated';
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  insert into ingestion_logging values (current_date,'Working forecast update',format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
  start_time := clock_timestamp();
 
  for i in (select plan_code
              from plan_smart.vw_plan_master vpm 
             where status=4
             and not is_deleted 
           )
  loop
    v_sql_text :=format(
            'update
                plan_smart.plan_modifications_%s pmd
             set
                %s,updated_by = %L, updated_at = %L
             from
                public.actual_ly_temp act
             where
                pmd.channel = act.channel
             and
                pmd.current_week = act.current_week 
             and
                pmd.class = act.class
             and
                pmd.hierarchy_code = act.hierarchy_code'
            ,i.plan_code,v_cls4, v_user_code, v_actioned_ts
            );
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
  
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    raise notice 'Scenario plan_code=% updated. Affected rows %',i.plan_code, v_affected_rows;
  end loop;
 

  select max(compared_week)
    into v_actual_refresh_min_week 
    from public.actual_ly_temp where total_qty > 0;
  
  raise notice '%', v_actual_refresh_min_week;
 
  update global.default_attributes 
  set attribute_value  = jsonb_build_object('value', v_actual_refresh_min_week)
  where attribute_type  = 'actual_refresh_min_week'; 

 
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
        ,v_actioned_ts
        , v_sql_text
        );

 
  end_time := clock_timestamp();
  duration := end_time - start_time;
  insert into ingestion_logging values (current_date,'Scenario Working forecast update',format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
 

 
end
$procedure$
;
