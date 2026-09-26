--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:update_pg_sync_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_pg_sync_status
DROP PROCEDURE IF EXISTS public.update_pg_sync_status(IN character varying);
CREATE OR REPLACE PROCEDURE public.update_pg_sync_status(IN character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.update_pg_sync_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _query text;
        begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
                insert into global.pg_sync_status (task, completed_at) values ($1, now()::timestamp)
                on conflict (task) do update set completed_at = now()::timestamp;
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