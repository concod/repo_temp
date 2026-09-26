--liquibase formatted sql
--changeset pooja.shekar@impactanalytics.co:sync_new_store_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:MTP-22944
--comment: initial changeset for sync_new_store_data
DROP PROCEDURE IF EXISTS public.sync_new_store_data();
CREATE OR REPLACE PROCEDURE public.sync_new_store_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from
          global.new_store_data
        where
          true;
        INSERT INTO "global".new_store_data (store_code, store_name, 
    instore_date, allocation_start_date, 
 is_store_created, store_groups, created_at)
    SELECT
          store_code,
          store_name,
          instore_date,
          allocation_start_date ,
          is_store_created ,
          replace(replace(replace(store_groups,']','}'),'[','{'),'''','')::varchar[] ,
          NOW() created_at 
          
          FROM
          public.new_store_data x;
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
