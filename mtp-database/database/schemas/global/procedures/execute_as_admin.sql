--liquibase formatted sql
--changeset kamaleshwaran.k@impactanalytics.co:execute_as_admin runOnChange:true stripComments:false splitStatements:false context:DAT-908 labels:execute_as_admin
--comment: Initial changeset for execute_as_admin
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.execute_as_admin(text);
CREATE OR REPLACE PROCEDURE global.execute_as_admin(in _sql text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.execute_as_admin';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		execute _sql;
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