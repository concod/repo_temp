--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:public.sync_plan_smart_actuals_preseason_step2_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-39944
--comment: initial changeset for public.sync_plan_smart_actuals_preseason_step2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_preseason_step2(IN p_channel text);
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_preseason_step2(IN p_channel text)
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
  cnt                       int := 0;
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
  set application_name = 'Preseaon actualisation update2 in progress';

  select (attribute_value ->> 'value')
  into v_actual_refresh_min_week
  from global.default_attributes 
  where attribute_type  = 'actual_refresh_min_week';
 
  select user_code
    into v_user_code
    from "global".user_master 
   where name = 'dataingestion';
  
  for i in (select channel,current_week
              from public.po_oo_iter
             where channel = p_channel
               and current_week > v_actual_refresh_min_week
              order by 1,2)
  loop
	call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
	v_sql_text := format('
    update
      %s wms
    set
      kpi156 = Coalesce(pcmt.kpi156,0),
      kpi184 = Coalesce(pcmt.kpi184,0),
      kpi158 = Coalesce(pcmt.kpi158,0), 
      kpi157 = Coalesce(pcmt.kpi157,0),
      kpi182 = Coalesce(pcmt.kpi182,0),
      kpi160 = Coalesce(pcmt.kpi160,0),
      kpi173 = Coalesce(pcmt.kpi173,0),
      kpi175 = Coalesce(pcmt.kpi175,0),
      kpi177 = Coalesce(pcmt.kpi177,0),
      updated_by = ' || v_user_code || ', 
      updated_at =  ''' || NOW() || '''
    from
      %s pcmt
    where
      wms.channel = pcmt.channel
    and
      wms.channel = %L
    and 
      wms.current_week = pcmt.current_week 
    and
      wms.current_week = %s
    and
      wms.class = pcmt.class
    and
      wms.hierarchy_code = pcmt.hierarchy_code'
    ,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,'plan_smart.po_oo_part_'||to_char(current_date,'YYYYMMDD')||'_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    cnt := cnt + 1;
    raise notice 'cnt: %', cnt;
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
  log_desc := 'Preseaon actualisation update2 for '||p_channel;
  insert into ingestion_logging values (current_date,log_desc,format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));

end
$procedure$
;