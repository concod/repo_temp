-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:sync_gurobi_weekly_cleanup runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_gurobi_weekly_cleanup
-- comment: initial changeset for sync_gurobi_weekly_cleanup

DROP PROCEDURE IF EXISTS public.sync_gurobi_weekly_cleanup();
CREATE OR REPLACE PROCEDURE public.sync_gurobi_weekly_cleanup()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_gurobi_weekly_cleanup';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
	DELETE FROM inventory_smart.create_allocation_result_flat_gurobi
	WHERE allocation_code IN (
		SELECT DISTINCT plan_code 
		FROM inventory_smart.plan_master 
		WHERE ((cast(To_char (created_at at time zone 'America/New_York', 'YYYY-MM-DD') as date)<=current_date-7)
and status = 1)
		OR (status IN (2,3) AND is_deleted = true)
	)
	OR allocation_code IN (
		SELECT DISTINCT concat('edit_', plan_code) 
		FROM inventory_smart.plan_master 
		WHERE ((cast(To_char (created_at at time zone 'America/New_York', 'YYYY-MM-DD') as date)<=current_date-7)
and status = 1)
		OR (status IN (2,3) AND is_deleted = true)
	);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;