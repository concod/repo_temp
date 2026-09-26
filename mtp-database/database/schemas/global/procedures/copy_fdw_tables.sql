--liquibase formatted sql
--changeset ashish@impactanalytics.co:copy_fdw_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_fdw_tables
DROP PROCEDURE IF EXISTS global.copy_fdw_tables(IN _tbl_list text[]);
CREATE OR REPLACE PROCEDURE global.copy_fdw_tables(IN _tbl_list text[])
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.copy_fdw_tables';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    stmt text;
    _tbl text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		FOR stmt IN
			SELECT 
			  'DROP FOREIGN TABLE IF EXISTS ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname) || ' ;'
			FROM 
			  pg_foreign_table ft
			JOIN 
			  pg_class c ON c.oid = ft.ftrelid
			JOIN 
			  pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'inventory_global' and c.relname = any(_tbl_list)
		  LOOP
			EXECUTE stmt;
		END LOOP;
		EXECUTE 'IMPORT FOREIGN SCHEMA global
		LIMIT TO (' || array_to_string(_tbl_list, ', ') || ')
		FROM SERVER foreign_server_name
		INTO inventory_global;';
		FOREACH _tbl IN ARRAY _tbl_list
		LOOP
			EXECUTE format('ALTER FOREIGN TABLE inventory_global.%I OPTIONS (ADD fetch_size ''100000'', ADD async_capable ''true'')', _tbl);
		END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
