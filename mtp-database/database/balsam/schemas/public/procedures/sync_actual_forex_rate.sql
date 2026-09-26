-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_actual_forex_rate runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_actual_forex_rate
-- comment: derived table for actual_forex_rate

DROP PROCEDURE IF EXISTS public.sync_actual_forex_rate;

create or replace procedure public.sync_actual_forex_rate()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_actual_forex_rate';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
    TRUNCATE TABLE global.actual_forex_rate;

    insert into global.actual_forex_rate
    ("date", source_currency_id, target_currency_id, planned_conversion_multiplier)
    select "date", source_currency_id, target_currency_id, planned_conversion_multiplier 
    from public.actual_forex;
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;