--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:sync_plan_smart_actualized_bop_chg7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-30751
--comment: Chester kpis are now added 
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actualized_bop();
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
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  v_ddl_create := 'create table if not exists actual_eoh (
                   channel varchar(50), class varchar, hierarchy_code int4 ,current_week int4,
                   kpi98  float8, kpi97  float8, kpi99  float8,
                   kpi107 float8,kpi106 float8, kpi108 float8,
                   kpi44 float8,kpi41 float8,kpi149 float8, kpi148 float8, 
                   kpi45 float8,kpi42 float8,kpi150 float8,
                   kpi104 float8,kpi62 float8,kpi151 float8,
                   kpi103 float8,kpi170 float8,
                   kpi152 float8,kpi105 float8,
                   kpi63 float8, kpi153 float8,kpi43 float8,kpi171 float8, 
                   kpi92 float8 generated always as (Coalesce(kpi98 * kpi107,0)) stored,
                   kpi91 float8 generated always as (Coalesce(kpi97 * kpi106,0)) stored,
                   kpi93 float8 generated always as (Coalesce(kpi99* kpi108,0)) stored,
                   kpi23 float8 generated always as (Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0)) stored,
                   kpi22 float8 generated always as (Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0)) stored,
                   kpi24 float8 generated always as (Coalesce(kpi99,0)-Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0)) stored,
                   kpi11 float8 generated always as (Coalesce(kpi98 * kpi107,0)-Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0)) stored,
                   kpi10 float8 generated always as (Coalesce(kpi97 * kpi106,0)-Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0)) stored,
                   kpi12 float8 generated always as (Coalesce(kpi99* kpi108,0)-Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0)) stored,
                   kpi114 float8 generated always as ( (Coalesce(kpi99* kpi108,0)-Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0))/
                   nullif((Coalesce(kpi99,0)-Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0)),0)) stored,
                   kpi112 float8 generated always as ((Coalesce(kpi97 * kpi106,0)-Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0))/nullif((Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0)),0)) stored,
                   kpi113 float8 generated always as ((Coalesce(kpi98 * kpi107,0)-Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0))/nullif((Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0)),0)) stored,
                   kpi38 float8 generated always as (Coalesce(kpi44,0)/nullif(((Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0))+Coalesce(kpi44,0)),0)) stored,
                   kpi37 float8 generated always as (Coalesce(kpi43,0)/nullif(((Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0))+Coalesce(kpi43,0)),0)) stored,
                   kpi39 float8 generated always as (Coalesce(kpi45,0)/nullif(((Coalesce(kpi99,0)-Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0))+Coalesce(kpi45,0)),0)) stored,
                   kpi142 float8 generated always as (  (Coalesce(kpi98,0)+Coalesce(kpi41)-Coalesce(kpi148,0))/nullif((kpi44),0)) stored,
                   kpi185 float8 generated always as ((Coalesce(kpi97,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0))/nullif((kpi43),0)) stored,
                   kpi164 float8 generated always as ((Coalesce(kpi99,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0))/nullif((kpi45),0)) stored,
                   constraint pk_actual_eoh primary key(channel,class,hierarchy_code,current_week)
                   )';
          
  v_ddl_truncate := 'truncate table actual_eoh ' ;           
  execute v_ddl_create;
  raise notice 'v_ddl_create : %',v_ddl_create;
 
  execute v_ddl_truncate;
  raise notice 'table actual_eoh truncated';
 
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
    v_dml_insert := format(
    'insert into actual_eoh(
      channel, 
      class, 
      hierarchy_code,
      current_week,
      kpi98 , 
      kpi97,
      kpi99,
      kpi107,
      kpi106,
      kpi108,
      kpi44,
      kpi41,
      kpi149,
      kpi45,
      kpi42,
      kpi150,
      kpi104,
      kpi62,
      kpi151,
      kpi103,
      kpi170,
      kpi152,
      kpi105,
      kpi63,
      kpi153,
      kpi43,
      kpi171,
      kpi148
      )
     select 
      channel, 
      class, 
      hierarchy_code,
      current_week,
      kpi98 , 
      kpi97,
      kpi99,
      kpi107,
      kpi106,
      kpi108,
      kpi44,
      kpi41,
      kpi149,
      kpi45,
      kpi42,
      kpi150,
      kpi104,
      kpi62,
      kpi151,
      kpi103,
      kpi170,
      kpi152,
      kpi105,
      kpi63,
      kpi153,
      kpi43,
      kpi171,
      kpi148
     from
     (select
      channel, 
      class, 
      hierarchy_code,
      current_week,
      lag(kpi23) over(partition by channel, class, hierarchy_code order by current_week) as kpi98, 
      lag(kpi22) over(partition by channel, class, hierarchy_code order by current_week) as kpi97,
      lag(kpi24) over(partition by channel, class, hierarchy_code order by current_week) as kpi99,
      kpi107,
      kpi106,
      kpi108,
      kpi44,
      kpi41,
      kpi149,
      kpi45,
      kpi42,
      kpi150,
      kpi104,
      kpi62,
      kpi151,
      kpi103,
      kpi170,
      kpi152,
      kpi105,
      kpi63,
      kpi153,
      kpi43,
      kpi171,
      kpi148
    from
      (select
       channel, 
       class, 
       hierarchy_code,
       current_week,
       kpi23, 
       kpi22,
       kpi24,
       kpi107,
       kpi106,
       kpi108,
       kpi44,
       kpi41,
       kpi149,
       kpi45,
       kpi42,
       kpi150,
       kpi104,
       kpi62,
       kpi151,
       kpi103,
       kpi170,
       kpi152,
       kpi105,
       kpi63,
       kpi153,
       kpi43,
       kpi171,
       kpi148
      from %s
      where
        channel in (SELECT distinct group_id  
                      FROM "global".store_attributes_filter
                     where business_unit <> ''Wholesale'' 
                       and group_id is not null
                    )
      and
        current_week in (%L)
      union all
      select
       channel, 
       class, 
       hierarchy_code,
       current_week,
       kpi23, 
       kpi22,
       kpi24,
       kpi107,
       kpi106,
       kpi108,
       kpi44,
       kpi41,
       kpi149,
       kpi45,
       kpi42,
       kpi150,
       kpi104,
       kpi62,
       kpi151,
       kpi103,
       kpi170,
       kpi152,
       kpi105,
       kpi63,
       kpi153,
       kpi43,
       kpi171,
       kpi148
     from %s
     where
       channel in (''CHESTER_DC'',''1002'',''RP10'',''HUSA'')
     and
       current_week in (%L)
    ) qin ) qout where current_week = %L'
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
 
  for i in (select channel,current_week
              from actual_eoh 
             where channel in ('CHESTER_DC','1002','RP10','HUSA')
               and current_week >  v_atualised_week
          group by channel,current_week)
  loop
  v_sql := '
  update plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text||'  w
  set kpi98  =   Coalesce(  actual_eoh.kpi98 ,0 ),
      kpi97  =   Coalesce(  actual_eoh.kpi97 ,0 ),
      kpi99  =   Coalesce(  actual_eoh.kpi99 ,0 ),
      kpi107  =  Coalesce(  actual_eoh.kpi107 ,0 ),
      kpi106  =  Coalesce(  actual_eoh.kpi106 ,0 ),
      kpi108  =  Coalesce(  actual_eoh.kpi108 ,0 ),
      kpi44  =   Coalesce(  actual_eoh.kpi44 ,0 ),
      kpi41  =   Coalesce(  actual_eoh.kpi41 ,0 ),
      kpi149  =  Coalesce(  actual_eoh.kpi149 ,0 ),
      kpi45  =   Coalesce(  actual_eoh.kpi45 ,0 ),
      kpi42  =   Coalesce(  actual_eoh.kpi42 ,0 ),
      kpi150  =  Coalesce(  actual_eoh.kpi150 ,0 ),
      kpi104  =  Coalesce(  actual_eoh.kpi104 ,0 ),
      kpi62  =   Coalesce(  actual_eoh.kpi62 ,0 ),
      kpi151  =  Coalesce(  actual_eoh.kpi151 ,0 ),
      kpi103  =  Coalesce(  actual_eoh.kpi103 ,0 ),
      kpi170  =  Coalesce(  actual_eoh.kpi170 ,0 ),
      kpi152  =  Coalesce(  actual_eoh.kpi152 ,0 ),
      kpi105  =  Coalesce(  actual_eoh.kpi105 ,0 ),
      kpi63  =   Coalesce(  actual_eoh.kpi63 ,0 ),
      kpi153  =  Coalesce(  actual_eoh.kpi153 ,0 ),
      kpi43  =   Coalesce(  actual_eoh.kpi43 ,0 ),
      kpi171  =  Coalesce(  actual_eoh.kpi171 ,0 ),
      kpi92  =   Coalesce(  actual_eoh.kpi92 ,0 ),
      kpi91  =   Coalesce(  actual_eoh.kpi91 ,0 ),
      kpi93  =   Coalesce(  actual_eoh.kpi93 ,0 ),
      kpi23  =   Coalesce(  actual_eoh.kpi23 ,0 ),
      kpi22  =   Coalesce(  actual_eoh.kpi22 ,0 ),
      kpi24  =   Coalesce(  actual_eoh.kpi24 ,0 ),
      kpi11  =   Coalesce(  actual_eoh.kpi11 ,0 ),
      kpi10  =   Coalesce(  actual_eoh.kpi10 ,0 ),
      kpi12  =   Coalesce(  actual_eoh.kpi12 ,0 ),
      kpi114  =  Coalesce(  actual_eoh.kpi114 ,0 ),
      kpi112  =  Coalesce(  actual_eoh.kpi112 ,0 ),
      kpi113  =  Coalesce(  actual_eoh.kpi113 ,0 ),
      kpi38  =   Coalesce(  actual_eoh.kpi38 ,0 ),
      kpi37  =   Coalesce(  actual_eoh.kpi37 ,0 ),
      kpi39  =   Coalesce(  actual_eoh.kpi39 ,0 ),
      kpi142  =  Coalesce(  actual_eoh.kpi142 ,0 ),
      kpi185  =  Coalesce(  actual_eoh.kpi185 ,0 ),
      kpi164  =  Coalesce(  actual_eoh.kpi164 ,0 ),
      kpi148  =  Coalesce(  actual_eoh.kpi148 ,0 )
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
 
  for i in (select channel,current_week
              from plan_smart.wf_master_1 
             where channel in ('CHESTER_DC','1002','RP10','HUSA')
          group by channel,current_week
            )
  loop
  v_sql := '
    WITH req AS (
    select 
      wms.channel , 
      wms.class , 
      wms.current_week , 
      wms.hierarchy_code , 
      Coalesce(om_kpi11,0) as kpi200 , 
      Coalesce(om_kpi10,0) as kpi201 , 
      Coalesce(om_kpi12,0) as kpi202 , 
      Coalesce(om_kpi23,0) as kpi49,
      Coalesce(om_kpi24,0) as kpi50,
      Coalesce(om_kpi222,0) as kpi53,
      Coalesce(om_kpi223,0) as kpi54,
      Coalesce(lm_kpi11,0) as kpi203 , 
      Coalesce(lm_kpi10,0) as kpi204 , 
      Coalesce(lm_kpi12,0) as kpi205 , 
      Coalesce(lm_kpi23,0) as kpi51,
      Coalesce(lm_kpi24,0) as kpi52,
      Coalesce(lm_kpi222,0) as kpi55,
      Coalesce(lm_kpi223,0) as kpi64,
      Coalesce(wms.kpi12,0)- Coalesce(lm_kpi12,0) as kpi211,
      Coalesce(wms.kpi11,0)-Coalesce(lm_kpi11,0) as kpi209 ,
      Coalesce(wms.kpi10,0)-Coalesce(lm_kpi10,0) as kpi210 ,
      Coalesce(wms.kpi11,0)-Coalesce(om_kpi11,0) as kpi207 ,
      Coalesce(wms.kpi10,0)-Coalesce(om_kpi10,0) as kpi208 ,
      Coalesce(wms.kpi12,0)-Coalesce(om_kpi12,0) as kpi206,
      Coalesce(wms.kpi222,0)-Coalesce(om_kpi222,0) as kpi58,
      Coalesce(wms.kpi223,0)-Coalesce(om_kpi223,0) as kpi59,
      Coalesce(wms.kpi222,0)-Coalesce(lm_kpi222,0) as kpi60,
      Coalesce(wms.kpi223,0)-Coalesce(lm_kpi223,0) as kpi61
    from plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text ||' wms
    left join (
        select channel, class, hierarchy_code,current_week,
        kpi10 as lm_kpi10,kpi11 as lm_kpi11,kpi12 as lm_kpi12, kpi23 as lm_kpi23, kpi24 as lm_kpi24,
        kpi222 as lm_kpi222, kpi223 as lm_kpi223
        from plan_smart.lf_master_1
    ) lm 
    on wms.channel = lm.channel 
    and wms.current_week = lm.current_week 
    and wms.class = lm.class 
    and wms.hierarchy_code = lm.hierarchy_code
    left join 
    ( 
        Select channel, class, hierarchy_code,current_week,
        kpi10 as om_kpi10,kpi11 as om_kpi11,kpi12 as om_kpi12,
        kpi23 as om_kpi23, kpi24 as om_kpi24,
        kpi222 as om_kpi222, kpi223 as om_kpi223
        from plan_smart.op_master_1
    ) om 
    on wms.channel = om.channel 
    and wms.current_week = om.current_week 
    and wms.class = om.class 
    and wms.hierarchy_code = om.hierarchy_code
  )
  UPDATE plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text ||' as wms
  SET 
    kpi200 = req.kpi200, 
    kpi201 = req.kpi201, 
    kpi202 = req.kpi202, 
    kpi49  = req.kpi49,
    kpi50  = req.kpi50,
    kpi53  = req.kpi53,
    kpi54  = req.kpi54,
    kpi203 = req.kpi203, 
    kpi204 = req.kpi204, 
    kpi205 = req.kpi205, 
    kpi51  = req.kpi51,
    kpi52  = req.kpi52,
    kpi55  = req.kpi55,
    kpi64  = req.kpi64,
    kpi211 = req.kpi211, 
    kpi209 = req.kpi209, 
    kpi210 = req.kpi210, 
    kpi207 = req.kpi207, 
    kpi208 = req.kpi208, 
    kpi206 = req.kpi206,
    kpi58  = req.kpi58,
    kpi59  = req.kpi59,
    kpi60  = req.kpi60,
    kpi61  = req.kpi61
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
