--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_time_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for rcl_psa_config_01

DROP PROCEDURE if exists public.sync_rcl_psa_config_table();

CREATE OR REPLACE PROCEDURE public.sync_rcl_psa_config_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_psa_config_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.rcl_psa_config_table;

    INSERT INTO inventory_smart.rcl_psa_config_table (
        id, l0_name, l1_name, psa_name, psa_code
    )
    SELECT 
        id, l0_name, l1_name, psa_name, psa_code
    FROM 
        public.rcl_psa_config_table x;
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
