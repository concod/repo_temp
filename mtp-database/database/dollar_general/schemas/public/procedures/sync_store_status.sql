--liquibase formatted sql
--changeset rajat.choudhary-01:sync_store_status_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:002
--comment: made the sync_store_status sp a full replace every day
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_status();
CREATE OR REPLACE PROCEDURE public.sync_store_status()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
                DELETE FROM "global".store_time_attributes
                WHERE TRUE;
                
                INSERT INTO "global".store_time_attributes
                (store_code, attribute_name, attribute_value, start_time, end_time)
                
                SELECT 
                s.store_code,	
                s.attribute_name,	
                s.attribute_value,
                s.start_time,	
                s.end_time
                FROM 
                  public.store_status s
                join global.store_attributes_filter paf using (store_code)
                on conflict do nothing;
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

