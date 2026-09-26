--liquibase formatted sql
--changeset ashish@impactanalytics.co:set_db_maintenance runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  Removed terminate session statement
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.set_db_maintenance(IN input boolean);
DROP PROCEDURE IF EXISTS public.set_db_maintenance(IN input boolean, text);
CREATE OR REPLACE PROCEDURE public.set_db_maintenance(IN input boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.set_db_maintenance';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_attribute_value jsonb := jsonb_build_object('value', $1);
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO "global".tenant_attribute_master
		(name, attribute_type, application_code, attribute_value)
		VALUES('maintenance_mode', 'APPLICATION', 3, _attribute_value)
		on conflict(name,
		attribute_type,
		application_code) do update set attribute_value = excluded.attribute_value;
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
