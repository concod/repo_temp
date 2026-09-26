-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_store_master_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_store_master_promo
-- comment: derived table for store_master

DROP PROCEDURE IF EXISTS public.sync_store_master_promo;

create or replace procedure public.sync_store_master_promo()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_master_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
    TRUNCATE TABLE price_promo.store_master;
    
	insert into price_promo.store_master
	(s0_name, s0_id, s1_name, s1_id, s2_name, s2_id, s3_name, s3_id, s4_name,
	 s4_id, s5_name, s5_id, store_code, store_name, store_status, type, store_open_flag,
 	 active, special_classification, climate_area, latitude, longitude, open_date, close_date, is_active, store_id
)
	select 
	s0_name, s0_id, s1_name, s1_id, s2_name, s2_id, s3_name, s3_id, s4_name,
	s4_id, s5_name, s5_id, store_code, store_name, store_status, type, store_open_flag,
 	active, special_classification, climate_area, latitude, longitude, open_date, close_date, is_active, store_id

	from public.store_master_pricesmart;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;