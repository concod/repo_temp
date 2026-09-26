-- liquibase formatted sql
-- changeset shameel.zeeeshan@impactanalytics.co:sync_rcl_constraint_exceptions runOnChange:true stripComments:false splitStatements:false context:added sp labels:added sync_rcl_constraint_exceptions table
-- comment: added sync_rcl_constraint_exceptions table  

DROP PROCEDURE if exists public.sync_rcl_constraint_exceptions();

CREATE OR REPLACE PROCEDURE public.sync_rcl_constraint_exceptions()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_constraint_exceptions';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    UPDATE inventory_smart.rcl_constraint_master_exceptions ex
    SET
        psa_code = attr.psa_code,
        psa_name = attr.psa_name
    FROM global.product_store_attributes_filter attr
    WHERE ex.store_code = attr.store_code 
    ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;
; 