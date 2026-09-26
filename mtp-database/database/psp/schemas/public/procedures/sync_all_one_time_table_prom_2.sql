-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_all_one_time_table_prom_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_all_one_time_table_prom_2
-- comment: initial changeset for sync_all_one_time_table_prom_2
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_all_one_time_table_prom_2();


CREATE OR REPLACE PROCEDURE public.sync_all_one_time_table_prom_2()
LANGUAGE plpgsql
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_all_one_time_table_prom_2';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
    INSERT INTO global.tb_country_currency_mapping VALUES (1, 1, 1);
   	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;