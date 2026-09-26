--liquibase formatted sql
--changeset saad.adeeb:added sp for sync_delete_store_group_on_open_date runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-49482
--comment: 	created SP for sync_delete_store_group_on_open_date with correct logic
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_delete_store_group_on_open_date();
CREATE OR REPLACE PROCEDURE public.sync_delete_store_group_on_open_date()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_delete_store_group_on_open_date';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM global.store_groups
    USING global.store_attributes_filter saf
    WHERE open_date <= current_date
    
      AND global.store_groups.name = saf.retail_facility_code;  
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;