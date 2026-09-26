--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_actuals_alter5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37339
--comment:  pre-season actualization and in-season actualization
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_actuals';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
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
 begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 	
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
 
  /*select array_agg(distinct channel) , array_agg(distinct compared_week)
  into v_channels,v_weeks
  from public.actual_ly_temp;*/
  /*
  for v_const_tbl_name,v_constraint_name in (
        select 
          key,
          value 
        from 
          jsonb_each_text('{"actual_ly_temp":"pk_actual_ly_temp", "po_oo_committed_table":"pk_po_oo_committed_table"}'::jsonb)
      )
  loop 
    if not exists (select constraint_name 
                     from information_schema.constraint_column_usage 
                    where table_name = v_const_tbl_name  and constraint_name = v_constraint_name) then
      
      v_constraint_sql := 'alter table '||v_const_tbl_name||' add CONSTRAINT pk_'||v_constraint_name||' PRIMARY KEY (channel, current_week, class, hierarchy_code)';        
      execute v_constraint_sql;
    end if;
  end loop;
  */
  v_sql_text := 'create index if not exists idx_actual_ly_temp on public.actual_ly_temp(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.actual_ly_temp';
  execute v_sql_text;
 
  for i in (select channel,current_week
              from public.actual_ly_temp
          group by channel,current_week
          order by channel,current_week)
  loop
	v_channel_part := regexp_replace(i.channel, '[ /.-]', '', 'g');
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    
    v_sql_text :=format(
    'insert into 
       %s(%s)
     select %s 
       from public.actual_ly_temp
     where 
       channel = %L
     and
       current_week = %s
     on conflict ON CONSTRAINT %s do update 
     set %s;'
     ,'plan_smart.wf_master_1_'||v_channel_part||'_'||i.current_week::text
     ,v_cls2
     ,v_cls1
     ,i.channel
     ,i.current_week
     ,'wf_master_1_'||v_channel_part||'_'||i.current_week::text||'_pkey'
     ,v_cls3
    );
    raise notice 'v_upsert_sql : %', v_sql_text;
    execute v_sql_text;
    v_cnt := v_cnt + 1;
    raise notice 'Table processed : %', v_cnt;
  end loop;
 
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  raise notice 'Working forecast updated. Affected rows %', v_affected_rows;
 
  for i in (select plan_code
              from plan_smart.vw_plan_master vpm 
             where status=4
           )
  loop
    v_sql_text :=format(
            'update
                plan_smart.plan_modifications_%s pmd
             set
                %s
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
            ,i.plan_code,v_cls4
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
  
  v_sql_text := 'create index if not exists idx_po_oo_committed_table on public.po_oo_committed_table(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.po_oo_committed_table';
  execute v_sql_text;
  
  for i in (select channel,current_week
              from public.po_oo_committed_table
          group by channel,current_week)
  loop
	v_channel_part_wf := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wf;
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wms
    set
      kpi156 = Coalesce(pcmt.kpi156,0),
      kpi157 = Coalesce(pcmt.kpi157,0),
      kpi158 = Coalesce(pcmt.kpi158,0), 
      kpi160 = Coalesce(pcmt.kpi160,0),
      kpi173 = Coalesce(pcmt.kpi173,0),
      kpi175 = Coalesce(pcmt.kpi175,0),
      kpi177 = Coalesce(pcmt.kpi177,0),
      kpi182 = Coalesce(pcmt.kpi182,0),
      kpi184 = Coalesce(pcmt.kpi184,0)   
    from
      public.po_oo_committed_table pcmt
    where
      pcmt.channel = %L
    and
      wms.channel = pcmt.channel
    and
      pcmt.current_week  = %s
    and
      wms.current_week = pcmt.current_week 
    and
      wms.class = pcmt.class
    and
      wms.hierarchy_code = pcmt.hierarchy_code'
	,'plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
  for i in  ( select 
               channel,current_week
              from 
                public.po_oo_committed_table 
              where 
                current_week <= v_actual_refresh_min_week
              group by 
                channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    
    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
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
      kpi177 = 0'   
	, 'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
   for i in (select channel,current_week
              from public.po_oo_committed_table
              where 
                current_week > v_actual_refresh_min_week
          group by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wp;
    
    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
      kpi156 = Coalesce(pcmt.kpi156,0),
      kpi184 = Coalesce(pcmt.kpi184,0),
      kpi158 = Coalesce(pcmt.kpi158,0), 
      kpi157 = Coalesce(pcmt.kpi157,0),
      kpi182 = Coalesce(pcmt.kpi182,0),
      kpi160 = Coalesce(pcmt.kpi160,0),
      kpi173 = Coalesce(pcmt.kpi173,0),
      kpi175 = Coalesce(pcmt.kpi175,0),
      kpi177 = Coalesce(pcmt.kpi177,0)
    from
      public.po_oo_committed_table pcmt
    where
      pcmt.channel = %L
    and
      wps.channel = pcmt.channel
    and
      pcmt.current_week  = %s
    and
      wps.current_week = pcmt.current_week 
    and
      wps.class = pcmt.class
    and
      wps.hierarchy_code = pcmt.hierarchy_code'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;


  
  for i in (select channel,current_week
              from 
                plan_smart.wp_master_1  
          group by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');

    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
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
      kpi176 = ((Coalesce(kpi62,0) - Coalesce(wps.kpi157,0) + (Coalesce(kpi170,0) - Coalesce(wps.kpi182,0))) / nullif((Coalesce(kpi41,0) - Coalesce(wps.kpi156,0) + (Coalesce(kpi171,0) - Coalesce(wps.kpi184,0))),0))'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;


  for i in (SELECT child.relname AS part_name
              FROM pg_inherits
              JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
              JOIN pg_class child ON pg_inherits.inhrelid = child.oid
              JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
              JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
              WHERE parent.relname = 'wf_master_1')
  loop
      for j in (SELECT child.relname AS part_name
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                WHERE parent.relname = i.part_name
                AND split_part(child.relname,'_',-1)::int >= v_actual_refresh_min_week)
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
          kpi57 = ((Coalesce(kpi162,0) +Coalesce(kpi160,0))/nullif((Coalesce(kpi159,0) + Coalesce(kpi158,0)),0))'
        ,j.part_name
        );
        raise notice 'v_update_sql: %', v_sql_text;
        execute v_sql_text;
      end loop;
  end loop;
  update global.default_attributes 
  set attribute_value  = jsonb_build_object('value', v_actual_refresh_min_week)
  where attribute_type  = 'actual_refresh_min_week';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;
