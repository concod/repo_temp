--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co::delete_latest_inventory_delta_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels
--comment: added updated_at condition to where clause 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.delete_latest_inventory_delta();
CREATE OR REPLACE PROCEDURE public.delete_latest_inventory_delta()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.delete_latest_inventory_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from inventory_smart.latest_inventory_delta
		where updated_at < (select * from public.max_inventory_syncstartdatetime imd);
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