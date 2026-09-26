--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:sync_item_smart_derived_tables_op_lf runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:sync_item_smart_derived_tables
--comment: sync_item_smart_derived_tables_op_lf
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_item_smart_derived_tables_op_lf(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_item_smart_derived_tables_op_lf(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
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
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_item_smart_derived_tables_op_lf';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
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
  v_sql:= format('create index if not exists idx_%s on %s(l1_name,channel,current_week)',p_source_table,p_source_table);
  execute v_sql;
 
  v_sql := 'drop table if exists tmp_partitions';
  execute v_sql;
 
  v_sql := format('create temp table tmp_partitions as
                   select l1_name, channel,current_week
                     from %s
                  group by l1_name, channel,current_week',p_source_table
                 );
  
  execute v_sql;
  
  select count(*) into v_cnt from tmp_partitions;
 
  raise notice 'tmp_partitions count = %',v_cnt;
  if v_cnt <> 0
  then
    if p_is_historic
    then
     if p_destination_table not like '%components%'
     then
	  for i in (SELECT child.relname AS part_name
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                WHERE parent.relname = p_destination_table)
      loop
         for j in (SELECT child.relname AS part_name
                     FROM pg_inherits
                     JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                     JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                     JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                     JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                    WHERE parent.relname = i.part_name)
         loop
	        for k in (SELECT child.relname AS part_name
                        FROM pg_inherits
                        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                       WHERE parent.relname = j.part_name)
            loop
              v_sql := 'drop table if exists item_smart.'||k.part_name;
              raise notice 'sql:%', v_sql;
              execute v_sql;
            end loop;
         end loop;
      end loop;
     else
      v_sql := 'truncate table item_smart.'||p_destination_table;
      execute v_sql;
     end if;
   
      for i in (select distinct l1_name from tmp_partitions)
      loop
	    v_sql := format('drop table if exists %s_%s'
                      ,p_source_table 
                      ,regexp_replace(i.l1_name, '[ /.-]', '', 'g')
                     );
        execute v_sql;              
        v_sql := format('create table %s_%s as
                       select * 
                       from %s
                       where l1_name = %L'
                      ,p_source_table
                      ,regexp_replace(i.l1_name, '[ /.-]', '', 'g')
                      ,p_source_table
                      ,i.l1_name);
        raise notice 'sql:%', v_sql;
        execute v_sql;
      
        v_sql:= format('create index if not exists idx_%s on %s(l1_name,channel,current_week)',p_source_table||'_'||regexp_replace(i.l1_name, '[ /.-]', '', 'g'),p_source_table||'_'||regexp_replace(i.l1_name, '[ /.-]', '', 'g'));
        raise notice 'temp l1_name table index:%',v_sql;
        execute v_sql;     
      end loop;
    
   
      for i in (select l1_name, channel,current_week from tmp_partitions order by l1_name, channel,current_week )
      loop
	    raise notice 'l1_name=%, channel=%,current_week=%',i.l1_name, i.channel,i.current_week;
	    if p_destination_table not like '%components%'
	    then
          call item_smart.create_item_schema(p_destination_table,array[i.l1_name],array[i.channel],array[i.current_week]);
        end if;
        v_sql := format('
            insert into item_smart.%s(%s,created_by,created_at,updated_by,updated_at)
            select %s,%s,%s,null as updated_by, null updated_at
            from %s
            where l1_name = %L
            and channel = %L
            and current_week = %s'
           ,p_destination_table
           ,v_columns_text1
           ,v_columns_text1
           ,v_created_by
           ,''''||v_created_at||''''
           ,p_source_table||'_'||regexp_replace(i.l1_name, '[ /.-]', '', 'g')
           ,i.l1_name
           ,i.channel
           ,i.current_week
           );
        raise notice 'v_sql:%',v_sql;
        execute v_sql;
        raise notice 'Completed loading table for l1_name= % channel= % current_week = %',i.l1_name,i.channel,i.current_week;     
      end loop;
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