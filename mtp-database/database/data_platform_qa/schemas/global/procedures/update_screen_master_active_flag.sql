--liquibase formatted sql
--changeset bhargava.basava@impactanalytics.co:update_screen_master_active_flag runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_module_master_ingestion_flag
DROP PROCEDURE IF EXISTS global.update_screen_master_active_flag(IN screen_names varchar[], IN screen_active_flag bool);
CREATE OR REPLACE PROCEDURE global.update_screen_master_active_flag(IN screen_names varchar[], IN screen_active_flag bool)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.update_screen_master_active_flag';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	update "global".screen_master
	set is_active=screen_active_flag
	where screen_name = any(screen_names);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$$;