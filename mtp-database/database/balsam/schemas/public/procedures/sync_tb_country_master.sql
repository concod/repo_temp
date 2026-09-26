-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_country_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_country_master
-- comment: derived table for tb_country_master

DROP PROCEDURE IF EXISTS public.sync_tb_country_master;

create or replace procedure public.sync_tb_country_master()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_country_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
    TRUNCATE TABLE global.tb_country_master;
    
	insert into global.tb_country_master
	(country_id, country_code, country_name
)
	select 
	country_id, country_code, country_name
	from public.tb_country_master;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;