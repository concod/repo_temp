--liquibase formatted sql
--changeset Shaik.Azmathulla@imapctanalytics.co:truncate_table_by_name runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:sync_delete_intermediate_supersession_upload
--comment: Created new sp for delete intermediate supersession upload
--rollback: SELECT 1

DROP procedure IF EXISTS public.truncate_table_by_name();
CREATE OR REPLACE PROCEDURE public.truncate_table_by_name(IN tbl_name text)
LANGUAGE 'plpgsql'
AS $procedure$
declare _t record ;
		_tb text;
		_sql text;
		_worker text;
		_db text ;
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.truncate_table_by_name';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	_db := current_database();
	raise notice '_db :%',_db;
	
	IF _db like '%rl_na%' THEN
	
		for _t in  
		 		   SELECT unnest_value AS tbl,
						  REVERSE(SUBSTRING(REVERSE(unnest_value), 1,POSITION('.' IN REVERSE(unnest_value))- 1)) AS table_name_
				   FROM   UNNEST(string_to_array(tbl_name,',')) as unnest_value
		loop
	
			_tb:= concat(_t.tbl,'_bkp_',replace(current_date::text,'-','_'));
			_sql := 'DROP TABLE IF EXISTS '||_tb||';';
			select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
			perform dblink_get_result(_worker);
			perform dblink_disconnect(_worker);
			_sql := '';
			_sql := 'CREATE TABLE '||_tb||' AS 
							SELECT * FROM '||_t.tbl||';';
			raise notice '_sql :%',_sql;
			--EXECUTE _sql ;
			select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
			perform dblink_get_result(_worker);
			perform dblink_disconnect(_worker);
			_sql := '';
			_sql := 'DELETE FROM '||_t.tbl||' WHERE true;';
			raise notice '_sql :%',_sql;
			--EXECUTE _sql ;
			select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
			perform dblink_get_result(_worker);
			perform dblink_disconnect(_worker);
			_sql := '';
			
			_sql := 'call global.build_list_partitions(''''' || _t.table_name_ || ''''')';
			--raise notice '_sql :%',_sql;
	 		_sql := 'call global.execute_as_admin(''' || _sql || ''');'	;	
			raise notice '_sql :%',_sql;
			
			select async_query into _worker from public.async_query( _sql);
			perform dblink_get_result(_worker);
			perform dblink_disconnect(_worker);
	
		end loop ;
		
	END IF ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;