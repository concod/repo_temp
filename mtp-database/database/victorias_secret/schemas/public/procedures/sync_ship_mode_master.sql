--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_ship_mode_master_v2 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-319
--comment: Updated SP for sync_ship_mode_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ship_mode_master();
CREATE OR REPLACE PROCEDURE public.sync_ship_mode_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ship_mode_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.ship_mode_master
		where 
		  true; 

		INSERT INTO inventory_smart.ship_mode_master (
    	l0_id,
    	vendor_name,
    	lead_time,
    	moq,
    	l2_name,
    	ship_mode
		) 
		select
		brand_code,
		vendor_name,
		lead_time,
		"MOQ",
		l2_name,
		ship_mode
		FROM 
		  public.ship_mode_master_derived x ;
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