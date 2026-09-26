--liquibase formatted sql
--changeset priyaranjan.pradhan@impactanalytics.co:sync_oms_safety_stock_kpi runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_safety_stock_kpi

DROP PROCEDURE IF EXISTS public.sync_oms_safety_stock_kpi(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_safety_stock_kpi(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_safety_stock_kpi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			update inventory_smart.oms_kpi ok
			set target_service_level =x.target_service_level,
			safety_stock =x.safety_stock,
			ss_base =x.ss_base
			from (
			SELECT 
					 product_code,"location",target_service_level,safety_stock,ss_base
					FROM 
					  public.oms_safetystock_latest x) x
			where ok.product_code = x.product_code and ok.loc_code = x."location" ;	
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
