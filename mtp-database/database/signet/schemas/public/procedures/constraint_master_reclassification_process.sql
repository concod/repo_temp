--liquibase formatted sql
--changeset Shaik.Azmathulla@impactanalytics.co:constraint_master_reclassification_process runOnChange:true stripComments:false splitStatements:false context:MTP-97176 labels:get_md5_from_array
--comment: Created new SP constraint_master_reclassification_process

DROP PROCEDURE IF EXISTS public.constraint_master_reclassification_process();
CREATE OR REPLACE PROCEDURE public.constraint_master_reclassification_process()
LANGUAGE 'plpgsql'
AS $procedure$
declare 
	_worker text;
	_l0 text;
	_sql text ;
	_part_tbl text ;
	_sch_nme text ;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.constraint_master_reclassification_process';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
		drop table if exists new_partition_table ;

		_log_step := 'partitions_creation';
		perform set_config('local.log_step', _log_step, true);
		
        select async_query into _worker
        from public.async_query('call global.build_list_partitions(''constraint_master_weekly'');');
        perform public.async_query_status(_worker, 'cleanup'); 
        raise notice 'Step1: %',(clock_timestamp() - _st);

		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'get_partition_list';
		perform set_config('local.log_step', _log_step, true);
		
		CREATE TEMP TABLE new_partition_table as 
		WITH RECURSIVE partition_tree AS 
		(
		    SELECT c.oid AS relid,c.relname AS partition_table,n.nspname AS schema_name,0 AS level
		    FROM pg_class c
		    JOIN pg_namespace n ON c.relnamespace = n.oid
		    WHERE c.oid = 'inventory_smart.constraint_master_weekly'::regclass
		    UNION ALL
		    SELECT c.oid,c.relname,n.nspname,level + 1 
		    FROM pg_inherits i
		    JOIN pg_class c ON i.inhrelid = c.oid
		    JOIN pg_namespace n ON c.relnamespace = n.oid
		    LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'c'
		    JOIN partition_tree pt ON i.inhparent = pt.relid
		)

		SELECT schema_name,partition_table,0 as old_part
		FROM partition_tree a
		WHERE partition_table != 'inventory_smart.constraint_master_weekly'
		AND level = 3;

		UPDATE new_partition_table AS a
		SET old_part = b.old_part
		FROM (
		    SELECT
		        1 AS old_part,
		        md5(lower(regexp_replace(l0_name, '\W+', '', 'g')) || '_' ||lower(regexp_replace(l1_name, '\W+', '', 'g')) ) AS part
			FROM global.product_attributes_filter
		    GROUP BY  l0_name,l1_name
		) b
		WHERE a.partition_table LIKE '%' || b.part || '%';

		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'drop_old_partitions';
		perform set_config('local.log_step', _log_step, true);

		for _l0 in select 
						l0_name
					  from 
						global.product_attributes_filter where l0_name in (select distinct l0_name from public.new_old_partition_data )
					  group by 
						1
					  order by 1 loop

			_log_step := 'parellel_update_'||_l0 ;
			perform set_config('local.log_step', _log_step, true);
			raise notice '_l0:%',_l0;
		    perform public.parellel_insert(
			    'WITH rows 
				 AS (

						UPDATE inventory_smart.constraint_master_weekly old
						SET l1_name = new.new_l1_name
						FROM (SELECT a.product_code,a.l0_name,b.old_l1_name as old_l1_name, b.new_l1_name
							  FROM global.product_attributes_filter a
							  join public.new_old_partition_data b on a.l0_name = b.l0_name and a.l1_name = b.new_l1_name
							  {where} and a.l0_name = ''' || _l0 || ''' 
							  ) new 
						WHERE old.product_code = new.product_code and old.l0_name = new.l0_name and old.l1_name = new.old_l1_name
					  	RETURNING 1
			      	) SELECT count(1) as cnt FROM rows;',50,
			    ' global.product_attributes_filter where l0_name = ''' || _l0 || ''' ', 
			    'product_code',
			    null,
			    100
				);
				call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
				
		end loop;

		_log_step := 'drop_old_partitions';
		perform set_config('local.log_step', _log_step, true);
		
		for _sch_nme,_part_tbl in select schema_name,partition_table from new_partition_table a where old_part = 0 order by partition_table
		loop
	
			_sql:= 'DROP TABLE IF EXISTS '||_sch_nme ||'.'||_part_tbl || ' ;' ;
			raise notice  '_sql: %',_sql;
			--EXECUTE _sql;
			select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
			perform dblink_get_result(_worker);
			perform dblink_disconnect(_worker);
	
		end loop;
		
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	
	call global.data_ingestion_logs(_log_code, _sp_name, 'end', null,  (clock_timestamp() - _st)::text, null);
	
end;
$procedure$;