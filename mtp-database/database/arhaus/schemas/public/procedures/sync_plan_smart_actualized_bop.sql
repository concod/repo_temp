--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_actualized_bop_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-47857
--comment:  audit trail implementation for sync_plan_smart_actualized_bop
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_plan_smart_actualized_bop();

CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actualized_bop()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_actualized_bop';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  v_atualised_week int4;
  v_weeks          int4[]; 
  v_week           int4;
  v_ddl_create     text;
  v_ddl_truncate   text;
  v_dml_insert     text;
  v_affected_rows  int8;
  v_sql            text;
  i                record;
  start_time       timestamp := clock_timestamp();
  end_time         timestamp;
  duration         interval;  
  v_user_code      int;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  set work_mem = '4GB';
  set application_name = 'actualized_bop in progress'; 
  v_ddl_create := 'create table if not exists actual_eoh (
                   channel varchar(50), class varchar, hierarchy_code int4, current_week int4,
                   kpi51 float8, kpi50 float8, kpi54 float8, kpi52 float8, 
				   kpi33 float8, kpi4 float8, kpi31 float8, kpi30 float8, 
                   kpi43 float8, kpi21 float8, kpi75 float8, kpi76 float8, kpi58 float8,
				   aoh_u float8, aoh_c float8, rcpt_u float8, rcpt_c float8, w_sls_U float8, w_cost float8, inv_adj_u float8, inv_adj_c float8,
                   kpi63 float8 generated always as (coalesce(kpi30,0) / nullif(coalesce(kpi31,0), 0)) stored,
                   kpi72 float8 generated always as (Coalesce(kpi31,0) + Coalesce(kpi51,0) - Coalesce(kpi43,0) - Coalesce(kpi54,0)) stored,
                   kpi73 float8 generated always as (Coalesce(kpi30,0) + Coalesce(kpi50,0) - Coalesce(kpi21,0) - Coalesce(kpi52,0)) stored,
                   kpi74 float8 generated always as ((Coalesce(kpi30,0) + Coalesce(kpi50,0) - Coalesce(kpi21,0) - Coalesce(kpi52,0)) / nullif((Coalesce(kpi31,0) + Coalesce(kpi51,0) - Coalesce(kpi43,0) - Coalesce(kpi54,0)), 0)) stored,
                   kpi79 float8 generated always as ((Coalesce(kpi31,0) + Coalesce(kpi31,0) + Coalesce(kpi51,0) - Coalesce(kpi43,0) - Coalesce(kpi54,0)) / 2) stored,
                   kpi80 float8 generated always as ((Coalesce(kpi30,0) + Coalesce(kpi30,0) + Coalesce(kpi50,0) - Coalesce(kpi21,0) - Coalesce(kpi52,0)) / 2) stored,
                   kpi81 float8 generated always as (Coalesce(kpi43,0) / nullif(((Coalesce(kpi31,0) + Coalesce(kpi31,0) + Coalesce(kpi51,0) - Coalesce(kpi43,0) - Coalesce(kpi54,0)) / 2), 0)) stored,
                   kpi82 float8 generated always as (Coalesce(kpi21,0) / nullif(((Coalesce(kpi30,0) + Coalesce(kpi30,0) + Coalesce(kpi50,0) - Coalesce(kpi21,0) - Coalesce(kpi52,0)) / 2), 0)) stored,
                   kpi64 float8 generated always as (Coalesce(aoh_u,0) + Coalesce(rcpt_u,0) - Coalesce(w_sls_U,0) - Coalesce(inv_adj_u,0)) stored,
                   kpi65 float8 generated always as (Coalesce(aoh_c,0) + Coalesce(rcpt_c,0) - Coalesce(w_cost,0) - Coalesce(inv_adj_c,0)) stored,
                   kpi68 float8 generated always as (Coalesce(aoh_u,0) + Coalesce(rcpt_u,0)) stored,
                   kpi70 float8 generated always as (Coalesce(aoh_c,0) + Coalesce(rcpt_c,0)) stored,
                   kpi55 float8 generated always as (coalesce(kpi54,0) / nullif(coalesce(kpi31,0), 0)) stored,
                   kpi53 float8 generated always as (coalesce(kpi52,0) / nullif(coalesce(kpi30,0), 0)) stored,
				   kpi59 float8 generated always as (coalesce(kpi58,0) / nullif(((Coalesce(kpi30,0) + Coalesce(kpi30,0) + Coalesce(kpi50,0) - Coalesce(kpi21,0) - Coalesce(kpi52,0)) / 2),0)) stored,
                   constraint pk_actual_eoh primary key(channel,class,hierarchy_code,current_week)
                   )';
 
  v_ddl_truncate := 'truncate table actual_eoh ';
  execute v_ddl_create;
 
  raise notice 'v_ddl_create : %',v_ddl_create;
 
  execute v_ddl_truncate;
  raise notice 'table actual_eoh truncated';
 
 
  select 
    user_code
  into 
    v_user_code
  from 
    "global".user_master 
  where 
     name = 'dataingestion';
 
  select (attribute_value ->> 'value')::int as atualised_week
    into v_atualised_week
    from "global".default_attributes da
   where attribute_type = 'actual_refresh_min_week';
  
  raise notice 'v_atualised_week : %',v_atualised_week;
  
  select array_agg(distinct current_week) 
    into v_weeks
    from plan_smart.wf_master_1 
   where current_week >= v_atualised_week ;
 
  raise notice 'v_weeks : %',v_weeks;
  if v_atualised_week is not null and v_weeks is not null then
  foreach v_week in array v_weeks
  loop
    v_dml_insert := format
    (
    'insert into actual_eoh
    (
      channel, 
      class, 
      hierarchy_code,
      current_week,
       kpi51,
       kpi50,
       kpi54,
       kpi52,
       kpi31,
       kpi30,
       kpi43, 
       kpi21,
	   kpi58,
	   aoh_u,
	   aoh_c,
	   rcpt_u,
	   rcpt_c,
	   inv_adj_u,
	   inv_adj_c,
	   w_sls_U,
	   w_cost
    )
     select  
      channel,
      class, 
      hierarchy_code,
      current_week,
       sum(kpi51) as kpi51,
       sum(kpi50) as kpi50,      
       sum(kpi54) as kpi54,
       sum(kpi52) as kpi52,
       sum(kpi31) as kpi31,
       sum(kpi30) as kpi30,
       sum(kpi43) as kpi43, 
       sum(kpi21) as kpi21,
	   sum(kpi58) as kpi58,
	   sum(aoh_u) as aoh_u,
	   sum(aoh_c) as aoh_c,
	   sum(rcpt_u) as rcpt_u,
	   sum(rcpt_c) as rcpt_c,
	   sum(inv_adj_u) as inv_adj_u,
	   sum(inv_adj_c) as inv_adj_c,
	   sum(w_sls_U) as w_sls_U,
	   sum(w_cost) as w_cost
     from
     (
     select 
      channel,
      class, 
      hierarchy_code,
      current_week,
      lag(sum(kpi72)) over(partition by channel, class, hierarchy_code order by current_week) as kpi31, 
      lag(sum(kpi73)) over(partition by channel, class, hierarchy_code order by current_week) as kpi30,
      sum(kpi51) as kpi51,
      sum(kpi50) as kpi50,      
      sum(kpi54) as kpi54,
      sum(kpi52) as kpi52,
      sum(kpi43) as kpi43, 
      sum(kpi21) as kpi21,
	  sum(kpi58) as kpi58,
	  lag(sum(kpi51)) over(partition by channel, class, hierarchy_code order by current_week) as rcpt_u,
      lag(sum(kpi50)) over(partition by channel, class, hierarchy_code order by current_week) as rcpt_c,      
      lag(sum(kpi54)) over(partition by channel, class, hierarchy_code order by current_week) as inv_adj_u,
      lag(sum(kpi52)) over(partition by channel, class, hierarchy_code order by current_week) as inv_adj_c,
      lag(sum(kpi33)) over(partition by channel, class, hierarchy_code order by current_week) as w_sls_U,
      lag(sum(kpi4)) over(partition by channel, class, hierarchy_code order by current_week) as w_cost,
	  lag(sum(kpi64)) over(partition by channel, class, hierarchy_code order by current_week) as aoh_u,
	  lag(sum(kpi65)) over(partition by channel, class, hierarchy_code order by current_week) as aoh_c
    from
      (
      select
       ''Warehouse'' as channel,
       class, 
       hierarchy_code,
       current_week,
       sum(kpi72) as kpi72,
       sum(kpi73) as kpi73,
       sum(kpi51) as kpi51,
       sum(kpi50) as kpi50,   
       sum(kpi54) as kpi54,
       sum(kpi52) as kpi52,
       sum(kpi43) as kpi43, 
       sum(kpi21) as kpi21,
       sum(kpi33) as kpi33,
       sum(kpi4) as kpi4,
	   sum(kpi64) as kpi64,
	   sum(kpi65) as kpi65,
	   sum(kpi58) as kpi58
      from %s
      where channel in (SELECT distinct channel FROM "global".store_attributes_filter)
      and current_week in (%L)
      GROUP BY channel, class, hierarchy_code, current_week
      union all
      select
       ''Warehouse'' as channel,
       class, 
       hierarchy_code,
       current_week,
       sum(kpi72) as kpi72,
       sum(kpi73) as kpi73,
       sum(kpi51) as kpi51,
       sum(kpi50) as kpi50,   
       sum(kpi54) as kpi54,
       sum(kpi52) as kpi52,
       sum(kpi43) as kpi43, 
       sum(kpi21) as kpi21,
       sum(kpi33) as kpi33,
       sum(kpi4) as kpi4,
	   sum(kpi64) as kpi64,
	   sum(kpi65) as kpi65,
	   sum(kpi58) as kpi58
     from %s
     where
       channel in (''Store'', ''Ecom'', ''Warehouse'')  
     and
       current_week in (%L) 
    GROUP BY  channel, class, hierarchy_code, current_week
    )
    qin GROUP BY channel,  class, hierarchy_code, current_week) 
    qout where current_week = %L
    GROUP BY channel, class, hierarchy_code, current_week'
    ,'plan_smart.wf_master_1'
    ,v_week
    ,(case when v_week = v_atualised_week then 'plan_smart.wf_master_1' else 'actual_eoh' end)
    ,(v_week-1)
    ,v_week
    );
    raise notice 'v_dml_insert:%',v_dml_insert;
    execute v_dml_insert;
    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    raise notice '% Rows created for week=%',v_affected_rows,v_week;
  end loop;
 
  for i in (select channel,current_week from plan_smart.wf_master_1 
            where channel in ('Warehouse') and current_week > v_atualised_week
            group by channel,current_week)
  loop
  v_sql := '
  update plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text||'  w
  set kpi31 = Coalesce(actual_eoh.kpi31,0),
      kpi30 = Coalesce(actual_eoh.kpi30,0),
      kpi63 = Coalesce(actual_eoh.kpi63,0),
      kpi72 = Coalesce(actual_eoh.kpi72,0),
      kpi73 = Coalesce(actual_eoh.kpi73,0),
      kpi74 = Coalesce(actual_eoh.kpi74,0),
      kpi79 = Coalesce(actual_eoh.kpi79,0),
      kpi80 = Coalesce(actual_eoh.kpi80,0),
      kpi81 = Coalesce(actual_eoh.kpi81,0),
      kpi82 = Coalesce(actual_eoh.kpi82,0),
      kpi64 = Coalesce(actual_eoh.kpi64,0),
      kpi65 = Coalesce(actual_eoh.kpi65,0),
      kpi68 = Coalesce(actual_eoh.kpi68,0),
      kpi70 = Coalesce(actual_eoh.kpi70,0),
      kpi55 = Coalesce(actual_eoh.kpi55,0),
      kpi53 = Coalesce(actual_eoh.kpi53,0),
	  kpi59 = Coalesce(actual_eoh.kpi59,0),
      updated_by = ' || v_user_code || ', 
      updated_at =  ''' || NOW() || ''' 
  from actual_eoh actual_eoh
  where actual_eoh.channel = w.channel
  and actual_eoh."class" = w."class"
  and actual_eoh.hierarchy_code = w.hierarchy_code
  and actual_eoh.current_week = w.current_week';
 
  raise notice '%',v_sql;
  execute v_sql;
  
  GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
 
  raise notice '% Rows affected in wf_master_1 ',v_affected_rows;
   
  end loop;
  end if;
 
  for i in (select channel,current_week from plan_smart.wf_master_1
            where channel in ('Warehouse')
            group by channel,current_week)
  loop
  v_sql := '
    WITH req AS (
    select 
      wms.channel , 
      wms.class , 
      wms.current_week , 
      wms.hierarchy_code , 
      Coalesce(om_kpi73,0) as kpi75, 
      Coalesce(lm_kpi73,0) as kpi76, 
      Coalesce(om_kpi73,0) - Coalesce(wms.kpi73,0) as kpi77,
      Coalesce(lm_kpi73,0) - Coalesce(wms.kpi73,0) as kpi78
    from plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text ||' wms
    left join (
        select channel, class, hierarchy_code,current_week,
        kpi73 as lm_kpi73       
        from plan_smart.lf_master_1
        where channel = '''||i.channel||'''
        and current_week = '||i.current_week||'
    ) lm 
    on wms.channel = lm.channel 
    and wms.current_week = lm.current_week 
    and wms.class = lm.class 
    and wms.hierarchy_code = lm.hierarchy_code
    left join 
    ( 
        Select channel, class, hierarchy_code,current_week,
        kpi73 as om_kpi73
        from plan_smart.op_master_1
        where channel = '''||i.channel||'''
        and current_week = '||i.current_week||'
    ) om 
    on wms.channel = om.channel 
    and wms.current_week = om.current_week 
    and wms.class = om.class 
    and wms.hierarchy_code = om.hierarchy_code
  )
  UPDATE plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text ||' as wms
  SET 
    kpi75 = req.kpi75, 
    kpi76 = req.kpi76, 
    kpi77 = req.kpi77, 
    kpi78 = req.kpi78,
    updated_by = ' || v_user_code || ', 
    updated_at =  ''' || NOW() || ''' 
  FROM req
  where wms.channel = req.channel 
  and wms.current_week = req.current_week 
  and wms.class = req.class 
  and wms.hierarchy_code = req.hierarchy_code';
  raise notice '%',v_sql;
  execute v_sql;
  GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
  raise notice '% Rows affected in wf_master_1',v_affected_rows;
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
        ,v_sql
        );     


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
