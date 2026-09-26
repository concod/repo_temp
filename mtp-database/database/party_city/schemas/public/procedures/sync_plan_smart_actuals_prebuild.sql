--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_actuals_prebuild runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38111
--comment: initial changeset for sync_plan_smart_actuals_prebuild
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_actuals_prebuild();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals_prebuild()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
  declare
  v_sql_text                text;
  v_table_name              text;
  v_stg_table_name          text;
  v_channels                text[];
  v_weeks                   int[];
  start_time                timestamp := clock_timestamp();
  end_time                  timestamp;
  duration                  interval; 
  cnt                       int4 := 0;
 begin
  set application_name = 'actual_ly_temp index+analyze in progress';
 
  v_sql_text := 'drop table if exists ingestion_logging ';
  execute v_sql_text;
   
  v_sql_text := 'create table if not exists ingestion_logging (run_date date, step text, comment text)';   
  execute v_sql_text;
  
  v_sql_text := 'create index if not exists idx1_actual_ly_temp on public.actual_ly_temp(channel,current_week)';
  execute v_sql_text;
  
  v_sql_text := 'create index if not exists idx2_actual_ly_temp on public.actual_ly_temp(channel,current_week,class,hierarchy_code)';
  execute v_sql_text; 
 
  v_sql_text := 'analyze public.actual_ly_temp';
  execute v_sql_text;  
 
  v_sql_text := 'create index if not exists idx1_po_oo_committed_table on public.po_oo_committed_table(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'create index if not exists idx2_po_oo_committed_table on public.po_oo_committed_table(channel,current_week,class,hierarchy_code)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.po_oo_committed_table';
  execute v_sql_text;
 
  v_table_name := 'plan_smart.po_oo_part_'||to_char(current_date,'YYYYMMDD');
  v_stg_table_name := 'po_oo_part_'||to_char(current_date,'YYYYMMDD');
  
  v_sql_text := 'drop table if exists '||v_table_name;
  execute v_sql_text;
 
  v_sql_text :='CREATE TABLE if not exists '||v_table_name||'(
  channel varchar(50) NOT NULL,
  "class" varchar(50) NOT NULL,
  current_week int4 NOT NULL,
  hierarchy_code int4 NOT NULL,
  kpi173 float8 NULL,
  kpi157 float8 NULL,
  kpi156 float8 NULL,
  kpi175 float8 NULL,
  kpi182 float8 NULL,
  kpi184 float8 NULL,
  kpi177 float8 NULL,
  kpi160 float8 NULL,
  kpi158 float8 NULL,
  CONSTRAINT pk_'||v_stg_table_name||' PRIMARY KEY (channel, current_week, class, hierarchy_code))  
    PARTITION BY LIST (channel)';
  execute v_sql_text;
 
  select array_agg(distinct channel),array_agg(distinct current_week) 
  into v_channels,v_weeks
  from public.po_oo_committed_table
  where channel in ('CHESTER_DC','1002','RP10','HUSA');

  call plan_smart.create_plan_schema(v_stg_table_name,v_channels::text[],v_weeks);
 
  v_sql_text := ' insert into '||v_table_name||' 
                  select * 
                  from public.po_oo_committed_table
                  where channel in (''CHESTER_DC'',''1002'',''RP10'',''HUSA'')';
  execute v_sql_text;
 
  v_sql_text := 'analyze '||v_table_name;
  execute v_sql_text;
 
  v_sql_text := 'drop table if exists po_oo_iter';
  execute v_sql_text;
 
  v_sql_text := 'create table po_oo_iter as 
                 select channel, current_week
                 from po_oo_committed_table
                 where channel in (''CHESTER_DC'',''1002'',''RP10'',''HUSA'')
                 group by channel, current_week';
  
  execute v_sql_text;
  
  v_sql_text := 'drop table if exists wf_parts';
  execute v_sql_text;
 
  v_sql_text := '
  create table wf_parts as
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
                           WHERE parent.relname = ''wf_master_1'')  
   ) a
   order by 1,3';
  execute v_sql_text;
 
  v_sql_text := 'drop table if exists wp_parts';
  execute v_sql_text;
 
  v_sql_text := '
  create table wp_parts as
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
                           WHERE parent.relname = ''wp_master_1'')  
   ) a
   order by 1,3';
  execute v_sql_text;
 
  end_time := clock_timestamp();
  duration := end_time - start_time;
  insert into ingestion_logging values (current_date,'Pre set up',format('Start Time: %s, End Time: %s, Duration: %s', start_time, end_time, duration));
 
 END;
$procedure$
;

