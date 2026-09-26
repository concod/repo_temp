--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_item_smart_derived_tables_chg4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:sync_item_smart_derived_tables
--comment: sync_item_smart_derived_tables
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
  v_created_by      int4:= 155;
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
  
  raise notice 'creating index on source table';
  v_sql:= format('create index if not exists idx_%s on %s(dept,channel,current_week)',p_source_table,p_source_table);
  execute v_sql;
 
  v_sql := 'drop table if exists tmp_partitions';
  execute v_sql;
 
  v_sql := format('create temp table tmp_partitions as
                   select dept, channel,current_week
                     from %s
                  group by dept, channel,current_week',p_source_table
                 );
  
  execute v_sql;
  
  select count(*) into v_cnt from tmp_partitions;
 
  raise notice 'tmp_partitions count = %',v_cnt;
-- After tmp_partitions is populated
if v_cnt <> 0 then

       for i in (select dept, channel, current_week from tmp_partitions order by dept, channel, current_week) loop
        raise notice 'Creating partitions for dept=%, channel=%, week=%', i.dept, i.channel, i.current_week;
        call item_smart.create_item_schema(p_destination_table, array[i.dept], array[i.channel], array[i.current_week]);
    end loop;

    -- HISTORIC branch: drop/truncate + insert
    if p_is_historic then
        if p_destination_table not like '%components%' then
            -- Drop all nested partitions
            for i in (
                SELECT child.relname AS part_name
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                WHERE parent.relname = p_destination_table
            ) loop
                for j in (
                    SELECT child.relname AS part_name
                    FROM pg_inherits
                    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                    JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                    JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                    WHERE parent.relname = i.part_name
                ) loop
                    for k in (
                        SELECT child.relname AS part_name
                        FROM pg_inherits
                        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                        WHERE parent.relname = j.part_name
                    ) loop
                        v_sql := 'drop table if exists item_smart.' || k.part_name;
                        raise notice '%', v_sql;
                        execute v_sql;
                    end loop;
                end loop;
            end loop;
        else
            v_sql := 'truncate table item_smart.' || p_destination_table;
            execute v_sql;
        end if;

        -- Insert per dept/channel/week
        for i in (select dept, channel, current_week from tmp_partitions order by dept, channel, current_week) loop
            v_sql := format('
                insert into item_smart.%s(%s, created_by, created_at, updated_by, updated_at)
                select %s, %s, %L, null, null
                from %s
                where dept = %L and channel = %L and current_week = %s',
                p_destination_table,
                v_columns_text1,
                v_columns_text1,
                v_created_by,
                v_created_at,
                p_source_table,
                i.dept,
                i.channel,
                i.current_week
            );
            raise notice 'Historic insert: %', v_sql;
            execute v_sql;
        end loop;

    else
        -- PERIODIC branch: UPSERT
        for i in (select dept, channel, current_week from tmp_partitions order by dept, channel, current_week) loop
            v_sql := format('
                insert into item_smart.%s(%s, created_by, created_at, updated_by, updated_at)
                select %s, %s, %L, null, null
                from %s
                where dept = %L and channel = %L and current_week = %s
                on conflict (dept, channel, sub_channel, hierarchy_code, current_week) do update
                set %s, updated_at = now()',
                p_destination_table,
                v_columns_text1,
                v_columns_text1,
                v_created_by,
                v_created_at,
                p_source_table,
                i.dept,
                i.channel,
                i.current_week,
                v_columns_text2
            );
            raise notice 'Periodic upsert: %', v_sql;
            execute v_sql;
        end loop;
RAISE NOTICE 'Starting delete of flag=0 rows for processed partitions...';
    FOR j IN (SELECT dept, channel, current_week FROM tmp_partitions) LOOP
        v_sql := format($$
            DELETE FROM item_smart.%I
            WHERE record_flag_update = 0
              AND dept = %L
              AND channel = %L
              AND current_week = %L
        $$,
        p_destination_table,
        j.dept, j.channel, j.current_week);

        RAISE NOTICE 'Delete SQL: %', v_sql;
        EXECUTE v_sql;
    END LOOP;

    RAISE NOTICE 'Delete of record_flag_update=0 rows completed.';

    end if;
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