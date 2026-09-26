--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_item_smart_derived_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment:  inital changeset for sync_item_smrt_derived_tables
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_item_smart_derived_tables(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_item_smart_derived_tables(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_item_smart_derived_tables';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  i                 record;
  j                 record;
  k                 record;
  n                 int4:=0;
  v_cnt             int4:=0;
  v_columns_text1   text;
  v_columns_text2   text;
  v_sql             text;
  v_created_at      timestamptz := now();
  v_created_by      int4:= 1;
  _worker           text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  set work_mem = '2GB';
  set maintenance_work_mem = '4GB';
 
  select string_agg(src_column_name,','),string_agg(src_column_name || ' = excluded.' || src_column_name, ',')
    into v_columns_text1, v_columns_text2
    from (select a.column_name as src_column_name,b.column_name as dest_column_name	
            from (SELECT column_name
	                FROM information_schema.columns
	               WHERE table_catalog = current_database()
	                 AND table_schema = 'public'
	                 AND table_name = p_source_table
	              order by ordinal_position) a
          full outer join	     
	             (SELECT column_name 
	                FROM information_schema.columns
	               WHERE table_catalog = current_database()
	                 AND table_schema = 'item_smart'
	                 AND table_name = p_destination_table
	              order by ordinal_position) b 
          on a.column_name = b.column_name
         ) c where src_column_name not in ('created_by','created_at','updated_by','updated_at') ;
  _st := clock_timestamp();
  raise notice 'creating index on source table';
  v_sql:= format('create index if not exists idx_%s on %s(dept,channel,current_week)',p_source_table,p_source_table);
  execute v_sql;
 raise notice 'creating index_time: %', (clock_timestamp() - _st);
  v_sql := 'drop table if exists tmp_partitions';
  execute v_sql;
  _st := clock_timestamp();
    v_sql := format( 
    'CREATE TEMP TABLE tmp_partitions AS
      WITH combined AS (
       SELECT 
         dept, 
         channel, 
         current_week,
         ''%s_'' || lower(regexp_replace(dept, ''[ /.-]'', '''', ''g'')) AS dept_partition,
         ''%s_'' || lower(regexp_replace(dept, ''[ /.-]'', '''', ''g'')) || ''_'' || lower(regexp_replace(channel, ''[ /.-]'', '''', ''g'')) AS channel_partition,
         ''%s_'' || item_smart.get_md5_from_array(array[lower(regexp_replace(dept, ''[ /.-]'', '''', ''g'')),
           lower(regexp_replace(channel, ''[ /.-]'', '''', ''g'')),
           current_week::text
         ]) AS full_partition
       FROM (
         SELECT dept, channel, current_week FROM public.%I GROUP BY dept, channel, current_week
         UNION
         SELECT dept, channel, current_week FROM item_smart.wp_master_mv  GROUP BY dept, channel, current_week
       ) base
     ),
     existing_tables AS (
       SELECT c.relname
       FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = ''item_smart'' AND c.relname LIKE ''%%%s%%''
     )
   SELECT 
       c.dept,
       c.channel,
       c.current_week,
       EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.dept_partition) AS is_dept_partition,
       EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.channel_partition) AS is_channel_partition,
       EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.full_partition) AS is_full_partition
     FROM combined c;',
     p_destination_table,  
     p_destination_table, 
     p_destination_table,  
     p_source_table,      
     p_destination_table   
  );
  raise notice 'tmp table created:%', v_sql;
  execute v_sql;

  raise notice 'creating tmp_partitions _time: %', (clock_timestamp() - _st);
  select count(*) into v_cnt from tmp_partitions;
 
  raise notice 'tmp_partitions count = %',v_cnt;
  if v_cnt <> 0
  then
    if p_is_historic then
      _st := clock_timestamp();
      v_sql := format('truncate table item_smart.%I ;', p_destination_table);
      execute v_sql;
      raise notice 'truncate table time: %', (clock_timestamp() - _st);
   end if;

	   _st := clock_timestamp();
	FOR i IN ( SELECT dept, jsonb_agg(jsonb_build_object('channel', channel, 'current_week', current_week) ORDER BY channel, current_week ASC) AS channel_week_data
FROM (
    SELECT dept, channel, current_week
    FROM tmp_partitions
    WHERE NOT is_dept_partition
    GROUP BY dept, channel, current_week

    UNION 

    SELECT dept, channel, current_week
    FROM tmp_partitions
    WHERE NOT is_channel_partition
    GROUP BY dept, channel, current_week

    UNION 

    SELECT dept, channel, current_week
    FROM tmp_partitions
    WHERE NOT is_full_partition
    GROUP BY dept, channel, current_week
) a
GROUP BY dept

			)
      loop
	  
	  	_st := clock_timestamp();
	   -- raise notice 'dept=%, channel=%,current_week=%',i.dept, i.channel,i.current_week;
	    if p_destination_table not like '%components%'
        then

		/*
		 SELECT async_query INTO _worker 
		 FROM public.async_query('call item_smart.create_item_schema_jsonb_v2 ('||quote_literal(i.dept) || ',' ||quote_literal(i.channel_week_data)|| ','||quote_literal(p_destination_table) ||'); ' );
        PERFORM public.async_query_status(_worker, 'cleanup');
		*/
		
		call item_smart.create_item_schema_jsonb_v2(i.dept,i.channel_week_data,p_destination_table);
		raise notice 'DDL Loop_time: % ,_dept: % ', (clock_timestamp() - _st),i.dept;
		
 end if;
end loop; 

FOR j IN (
  SELECT dept, channel, current_week
  FROM tmp_partitions
)
LOOP
  v_sql := format('
    insert into item_smart.%I(%s, created_by, created_at, updated_by, updated_at)
    select %s, %s, %L, null, null
    from %I
    where dept = %L and channel = %L and current_week = %L',
    p_destination_table,
    v_columns_text1,
    v_columns_text1,
    v_created_by,
    v_created_at,
    p_source_table,
    j.dept,
    j.channel,
    j.current_week
  );

  RAISE NOTICE 'Insert SQL: %', v_sql;
  EXECUTE v_sql;
END LOOP;
raise notice 'final insert _time: %', (clock_timestamp() - _st);
end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
