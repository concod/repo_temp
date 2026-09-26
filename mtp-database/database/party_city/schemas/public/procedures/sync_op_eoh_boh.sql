--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:public.sync_op_eoh_boh runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-40095
--comment: initial changeset for sync_op_eoh_boh
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_op_eoh_boh(IN p_channel text);
CREATE OR REPLACE PROCEDURE public.sync_op_eoh_boh(IN p_channel text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
  v_atualised_week int4;
  v_week           int4;
  v_ddl_create     text;
  v_ddl_truncate   text;
  v_dml_insert     text;
  v_affected_rows  int8;
  v_sql            text;
  i                record;
  j                record;
  start_time       timestamp := clock_timestamp();
  end_time         timestamp;
  duration         interval; 
  v_tbl_name       text := 'op_actual_eoh_'||p_channel;
begin
  set work_mem = '2GB';
  set application_name = 'actualized_bop in progress'; 
 
  v_sql := 'drop table if exists ingestion_logging ';
  execute v_sql;
   
  v_sql := 'create table if not exists ingestion_logging (run_date date, step text, comment text)';	 
  execute v_sql; 
 
  v_sql := 'drop table if exists op_parts';
  execute v_sql;
 
  v_sql := '
  create table op_parts as
  select 
    BU,
    channel,
    part_name,
    current_week
  from 
  (select 
    case 
	  when (child.relname like ''%rp10%'') or (child.relname like ''%1002%'') or (child.relname like ''%husa%'')
	  then ''Retail''
	  when (child.relname like ''%chester%'')
	  then ''CHESTER_DC''
	  else ''Wholesale''
  end as BU,
  case 
	when (child.relname like ''%rp10%'') then ''RP10''
	when (child.relname like ''%1002%'') then ''1002''
	when (child.relname like ''%husa%'') then ''HUSA''
	when (child.relname like ''%chester_dc%'') then ''CHESTER_DC''
	when (child.relname like ''%albertsons%'') then ''ALBERTSONS COMPANIES INC.''
	when (child.relname like ''%walmart%'') then ''WALMART CANADA INC''
	when (child.relname like ''%internal%'') then ''INTERNAL''
	when (child.relname like ''%canadian_tire%'') then ''CANADIAN_TIRE''
	when (child.relname like ''%cvs%'') then ''CVS PHARMACY INC.''
	when (child.relname like ''%wegmans%'') then ''WEGMANS FOOD MARKET INC.''
	when (child.relname like ''%wakefern%'') then ''WAKEFERN FOOD CORP.''
	when (child.relname like ''%giant%'') then ''GIANT EAGLE INC.''
	when (child.relname like ''%speciality%'') then ''SPECIALITY''
	when (child.relname like ''%franchise%'') then ''FRANCHISE''
	when (child.relname like ''%meijer%'') then ''MEIJER INC.''
	when (child.relname like ''%other%'') then ''OTHER''
    end as channel,
    child.relname AS part_name, split_part(child.relname,''_'',-1)::int as current_week
   FROM pg_inherits
   JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
   JOIN pg_class child ON pg_inherits.inhrelid = child.oid
   JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
   JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
   WHERE parent.relname in (SELECT child.relname AS part_name
                            FROM pg_inherits
                            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                            JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                            JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                            JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                           WHERE parent.relname = ''op_master_1'')  
   ) a
   order by 1,3';
  execute v_sql;
 
  v_ddl_create := 'create table if not exists '||v_tbl_name||' (
                   channel varchar(50), class varchar, hierarchy_code int4 ,current_week int4,
                   kpi98  float8, kpi97  float8, kpi99  float8,
                   kpi44 float8,kpi41 float8,kpi149 float8, kpi148 float8, 
                   kpi45 float8,kpi42 float8,kpi150 float8,
                   kpi104 float8,kpi62 float8,kpi151 float8,
                   kpi103 float8,kpi170 float8,
                   kpi152 float8,kpi105 float8,
                   kpi92 float8, kpi91 float8, kpi93 float8,
                   kpi127 float8, kpi128 float8, kpi129 float8, kpi25 float8, kpi26 float8, kpi226 float8, kpi27 float8, kpi230 float8,
                   kpi227 float8, kpi28 float8, kpi231 float8,
                   kpi63 float8, kpi153 float8,kpi43 float8,kpi171 float8, kpi218 float8, kpi219 float8,
                   kpi220 float8 generated always as ((Coalesce(kpi98,0))*(Coalesce(kpi218,0))) stored,
                   kpi221 float8 generated always as ((Coalesce(kpi99,0))*(Coalesce(kpi219,0))) stored,
                   kpi107 float8 generated always as (Coalesce(kpi92, 0)/nullif(Coalesce(kpi98, 0), 0)) stored,
                   kpi106 float8 generated always as (Coalesce(kpi91, 0)/nullif(Coalesce(kpi97, 0), 0)) stored,
                   kpi108 float8 generated always as (Coalesce(kpi98, 0)/nullif(Coalesce(kpi99, 0), 0)) stored,
                   kpi22 float8 generated always as (Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0)) stored,
                   kpi11 float8 generated always as (Coalesce(kpi98 * (Coalesce(kpi92, 0)/NULLIF(Coalesce(kpi98, 0), 0)),0)-Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0)) stored,
                   kpi10 float8 generated always as (Coalesce(kpi97 * (Coalesce(kpi91, 0)/NULLIF(Coalesce(kpi97, 0), 0)),0)-Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0)) stored,
                   kpi12 float8 generated always as (Coalesce(kpi99 * (Coalesce(kpi98, 0)/NULLIF(Coalesce(kpi99, 0), 0)),0)-Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0)) stored,
                   kpi222 float8 generated always as (coalesce(kpi218,0) + Coalesce(kpi226,0) - coalesce(kpi27,0) - Coalesce(kpi230,0)) stored,
                   kpi223 float8 generated always as (coalesce(kpi219,0) + Coalesce(kpi227,0) - coalesce(kpi28,0) - Coalesce(kpi231,0)) stored,
                   kpi224 float8 generated always as  ((coalesce(kpi218,0) + Coalesce(kpi226,0) - coalesce(kpi27,0) - Coalesce(kpi230,0))/nullif((Coalesce(kpi98,0)+Coalesce(kpi41,0)-Coalesce(kpi44,0)-Coalesce(kpi25,0)-Coalesce(kpi148,0)),0)) stored,
                   kpi225 float8 generated always as  ((coalesce(kpi219,0) + Coalesce(kpi227,0) - coalesce(kpi28,0) - Coalesce(kpi231,0))/nullif((Coalesce(kpi99,0)+Coalesce(kpi63,0)-Coalesce(kpi45,0)-Coalesce(kpi26,0)-Coalesce(kpi150,0)),0)) stored,
                   kpi23 float8 generated always as (Coalesce(kpi98,0)+Coalesce(kpi41,0)-Coalesce(kpi44,0)-Coalesce(kpi25,0)-Coalesce(kpi148,0)) stored,
                   kpi24 float8 generated always as (Coalesce(kpi99,0)+ Coalesce(kpi63,0)- Coalesce(kpi45,0)-Coalesce(kpi26,0) - coalesce(kpi150,0)) stored,
                   kpi114 float8 generated always as ( (Coalesce(kpi99* (Coalesce(kpi98, 0)/NULLIF(Coalesce(kpi99, 0), 0)),0)-Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0))/
                   nullif((Coalesce(kpi99,0)-Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0)),0)) stored,
                   kpi112 float8 generated always as ((Coalesce(kpi97 * (Coalesce(kpi91, 0)/NULLIF(Coalesce(kpi97, 0), 0)),0)-Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0))/nullif((Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0)),0)) stored,
                   kpi113 float8 generated always as ((Coalesce(kpi98 * (Coalesce(kpi92, 0)/NULLIF(Coalesce(kpi98, 0), 0)),0)-Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0))/nullif((Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0)),0)) stored,
                   kpi38 float8 generated always as (Coalesce(kpi44,0)/nullif(((Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0))+Coalesce(kpi44,0)),0)) stored,
                   kpi37 float8 generated always as (Coalesce(kpi43,0)/nullif(((Coalesce(kpi97,0)-Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0))+Coalesce(kpi43,0)),0)) stored,
                   kpi39 float8 generated always as (Coalesce(kpi45,0)/nullif(((Coalesce(kpi99,0)-Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0))+Coalesce(kpi45,0)),0)) stored,
                   kpi142 float8 generated always as (  (Coalesce(kpi98,0)+Coalesce(kpi41)-Coalesce(kpi148,0))/nullif((kpi44),0)) stored,
                   kpi185 float8 generated always as ((Coalesce(kpi97,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0))/nullif((kpi43),0)) stored,
                   kpi164 float8 generated always as ((Coalesce(kpi99,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0))/nullif((kpi45),0)) stored,
                   kpi86 float8 generated always as ((Coalesce(kpi128,0))/nullif((Coalesce(kpi92,0)+ Coalesce(kpi92,0)-Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0))/2,0)) stored,
                   kpi85 float8 generated always as ((Coalesce(kpi127,0))/nullif((Coalesce(kpi91,0)+ Coalesce(kpi91,0)-Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0))/2,0)) stored,
				   kpi87 float8 generated always as ((Coalesce(kpi129,0))/nullif((Coalesce(kpi93,0)+ Coalesce(kpi93,0)-Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0))/2,0)) stored, 
                   kpi35 float8 generated always as ((Coalesce(kpi98,0)+Coalesce(kpi98,0)-Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0))/2) stored,
                   kpi34 float8 generated always as ((Coalesce(kpi97,0)+Coalesce(kpi97,0)-Coalesce(kpi43,0)+ Coalesce(kpi171,0)-Coalesce(kpi149,0))/2) stored,
                   kpi36 float8 generated always as ((Coalesce(kpi99,0)+Coalesce(kpi99,0)-Coalesce(kpi45,0)+ Coalesce(kpi42,0)-Coalesce(kpi150,0))/2) stored,
                   kpi83 float8 generated always as ((Coalesce(kpi44,0))/nullif((Coalesce(kpi98,0)+  Coalesce(kpi98,0)- Coalesce(kpi44,0)+Coalesce(kpi41,0)-Coalesce(kpi148,0))/2,0)) stored,
                   kpi82 float8 generated always as ((Coalesce(kpi43,0))/nullif((Coalesce(kpi97,0)+  Coalesce(kpi97,0)- Coalesce(kpi43,0)+Coalesce(kpi171,0)-Coalesce(kpi149,0))/2,0)) stored,
                   kpi84 float8 generated always as ((Coalesce(kpi45,0))/nullif((Coalesce(kpi99,0)+  Coalesce(kpi99,0)- Coalesce(kpi45,0)+Coalesce(kpi42,0)-Coalesce(kpi150,0))/2,0)) stored,
                   kpi77 float8 generated always as ((Coalesce(kpi104,0))/nullif((Coalesce(kpi92,0)+ Coalesce(kpi92,0)- Coalesce(kpi104,0)+Coalesce(kpi62,0)-Coalesce(kpi151,0))/2,0)) stored,
                   kpi76 float8 generated always as ((Coalesce(kpi103,0))/nullif((Coalesce(kpi91,0)+ Coalesce(kpi91,0)- Coalesce(kpi103,0)+Coalesce(kpi170,0)-Coalesce(kpi152,0))/2,0)) stored,
                   kpi78 float8 generated always as ((Coalesce(kpi105,0))/nullif((Coalesce(kpi93,0)+ Coalesce(kpi93,0)- Coalesce(kpi105,0)+Coalesce(kpi63,0)-Coalesce(kpi153,0))/2,0)) stored,
                   constraint pk_'||v_tbl_name||' primary key(channel,class,hierarchy_code,current_week)
                   )';
          
  raise notice 'v_ddl_create : %',v_ddl_create;
  execute v_ddl_create;
 
  v_ddl_truncate := 'truncate table '||v_tbl_name ;
  execute v_ddl_truncate;
  raise notice 'table actual_eoh truncated';
  
  for j in (select 
              left(current_week::text, 4) as current_year ,
              array_agg(current_week)     as v_weeks
            from 
              op_parts 
            where
              channel = p_channel
            group by
              left(current_week::text, 4)
            order by left(current_week::text, 4)
           )
 loop           
    raise notice 'v_weeks : %',j.v_weeks;
    foreach v_week in array j.v_weeks
    loop
      v_dml_insert := format('insert into '||v_tbl_name||'(
      channel,
      class, 
      hierarchy_code,
      current_week,
      kpi98 , 
      kpi97,
      kpi99,
      kpi92,
      kpi91,
      kpi93,
      kpi218,
      kpi219,
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
      kpi148,
      kpi127,
 	  kpi128,
      kpi129,
      kpi25,
      kpi26,
      kpi27,
      kpi28,
      kpi226,
      kpi227,
      kpi230,
      kpi231
      )
     select 
      channel, 
      class, 
      hierarchy_code,
      current_week,
      kpi98 , 
      kpi97,
      kpi99,
      kpi92,
      kpi91,
      kpi93,
      kpi218,
      kpi219,
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
      kpi148,
      kpi127,
 	  kpi128,
      kpi129,
      kpi25,
      kpi26,
      kpi27,
      kpi28,
      kpi226,
      kpi227,
      kpi230,
      kpi231
     from
     (select
      channel, 
      class, 
      hierarchy_code,
      current_week,
      lag(kpi23) over(partition by channel, class, hierarchy_code order by current_week) as kpi98, 
      lag(kpi22) over(partition by channel, class, hierarchy_code order by current_week) as kpi97,
      lag(kpi24) over(partition by channel, class, hierarchy_code order by current_week) as kpi99,
      lag(kpi11) over(partition by channel, class, hierarchy_code order by current_week) as kpi92,
      lag(kpi10) over(partition by channel, class, hierarchy_code order by current_week) as kpi91,
      lag(kpi12) over(partition by channel, class, hierarchy_code order by current_week) as kpi93,
      lag(kpi222) over(partition by channel, class, hierarchy_code order by current_week) as kpi218,
      lag(kpi223) over(partition by channel, class, hierarchy_code order by current_week) as kpi219,
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
      kpi148,
      kpi127,
 	  kpi128,
      kpi129,
      kpi25,
      kpi26,
      kpi27,
      kpi28,
      kpi226,
      kpi227,
      kpi230,
      kpi231
    from
      (select
       channel, 
       class, 
       hierarchy_code,
       current_week,
       kpi23, 
       kpi22,
       kpi24,
       kpi11,
       kpi10,
       kpi12,
       kpi222,
       kpi223,
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
       kpi148,
       kpi127,
 	   kpi128,
       kpi129,
       kpi25,
       kpi26,
       kpi27,
       kpi28,
       kpi226,
       kpi227,
       kpi230,
       kpi231
      from %s
      where
        channel = '''||p_channel||'''
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
       kpi11,
       kpi10,
       kpi12,
       kpi222,
       kpi223,
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
       kpi148,
       kpi127,
 	   kpi128,
       kpi129,
       kpi25,
       kpi26,
       kpi27,
       kpi28,
       kpi226,
       kpi227,
       kpi230,
       kpi231
     from %s
     where
       channel = '''||p_channel||'''
     and
       current_week in (%L)
    ) qin ) qout where current_week = %L'
    ,'plan_smart.op_master_1'
    ,v_week+1
    ,(case when v_week::text like '%01'  then 'plan_smart.op_master_1' else v_tbl_name end)
    ,(v_week)
    ,v_week+1
    );
   
    raise notice 'v_dml_insert:%',v_dml_insert;
    execute v_dml_insert;
    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    raise notice '% Rows created for week=%',v_affected_rows,v_week;
    end loop;
   end loop;
  
  v_sql := 'create index idx_'||v_tbl_name||' on '||v_tbl_name||'(channel,current_week)';
  for i in execute format('select channel,current_week
                             from %s 
                            where channel = %L
                            group by channel,current_week'
                           ,v_tbl_name
                           ,p_channel
                         )
  loop
    v_sql := '
    update plan_smart.op_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text||'  w
    set kpi98  =   Coalesce(  actual_eoh.kpi98 ,0 ),
      kpi97    =   Coalesce(  actual_eoh.kpi97 ,0 ),
      kpi99    =   Coalesce(  actual_eoh.kpi99 ,0 ),
      kpi107   =  Coalesce(  actual_eoh.kpi107 ,0 ),
      kpi106   =  Coalesce(  actual_eoh.kpi106 ,0 ),
      kpi108   =  Coalesce(  actual_eoh.kpi108 ,0 ),
      kpi44    =   Coalesce(  actual_eoh.kpi44 ,0 ),
      kpi41    =   Coalesce(  actual_eoh.kpi41 ,0 ),
      kpi149   =  Coalesce(  actual_eoh.kpi149 ,0 ),
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
      kpi148  =  Coalesce(  actual_eoh.kpi148 ,0 ),
      kpi86   =  Coalesce(  actual_eoh.kpi86 , 0 ),
      kpi85   =  Coalesce(  actual_eoh.kpi85 , 0 ),
      kpi87   =  Coalesce(  actual_eoh.kpi87 , 0 ),
      kpi35   =  Coalesce(  actual_eoh.kpi35 , 0 ),
      kpi34   =  Coalesce(  actual_eoh.kpi34 , 0 ),
      kpi36   =  Coalesce(  actual_eoh.kpi36 , 0 ),
      kpi83   =  Coalesce(  actual_eoh.kpi83 , 0 ),
      kpi82   =  Coalesce(  actual_eoh.kpi82 , 0 ),
      kpi84   =  Coalesce(  actual_eoh.kpi84 , 0 ),
      kpi77   =  Coalesce(  actual_eoh.kpi77 , 0 ),
      kpi76   =  Coalesce(  actual_eoh.kpi76 , 0 ),
      kpi78   =  Coalesce(  actual_eoh.kpi78 , 0 ),
      kpi218   =  Coalesce(  actual_eoh.kpi218 , 0 ),
      kpi219   =  Coalesce(  actual_eoh.kpi219 , 0 ),
      kpi220   =   Coalesce(  actual_eoh.kpi220 , 0 ),
      kpi221   =  Coalesce(  actual_eoh.kpi221 , 0 ),
      kpi222   =  Coalesce(  actual_eoh.kpi222 , 0 ),
      kpi223   =  Coalesce(  actual_eoh.kpi223 , 0 ),
      kpi224   =  Coalesce(  actual_eoh.kpi224 , 0 ),
      kpi225   =  Coalesce(  actual_eoh.kpi225 , 0 ),
      kpi226   =   Coalesce(  actual_eoh.kpi226 , 0 ),
      kpi227   =  Coalesce(  actual_eoh.kpi227 , 0 ),
      kpi230   =  Coalesce(  actual_eoh.kpi230 , 0 ),
      kpi231  =  Coalesce(  actual_eoh.kpi231 , 0 ),
      kpi25   =  Coalesce(  actual_eoh.kpi25 , 0 ),
      kpi26   =  Coalesce(  actual_eoh.kpi26 , 0 ),
      kpi27   =  Coalesce(  actual_eoh.kpi27 , 0 ),
      kpi28   =  Coalesce(  actual_eoh.kpi28 , 0 )
    from '||v_tbl_name||' actual_eoh
    where actual_eoh.channel = w.channel
    and actual_eoh."class" = w."class"
    and actual_eoh.hierarchy_code = w.hierarchy_code
    and actual_eoh.current_week = w.current_week';
 
    raise notice '%',v_sql;
    execute v_sql;
  
    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
 
    raise notice '% Rows affected in wf_master_1 ',v_affected_rows;
   
    end loop;
 end_time := clock_timestamp();
 duration := end_time - start_time;
 insert into ingestion_logging values (current_date,'sync_wp_eoh_boh for '||p_channel,format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
 
end
$procedure$
;

