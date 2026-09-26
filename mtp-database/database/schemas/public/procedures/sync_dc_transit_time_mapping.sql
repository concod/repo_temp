--liquibase formatted sql
--changeset liquibase:sync_dc_transit_time_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_transit_time_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_transit_time_mapping();
CREATE OR REPLACE PROCEDURE public.sync_dc_transit_time_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_transit_time_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO inventory_smart.dc_transit_time_mapping (mapping_code, transit_time) 
		SELECT 
		  mapping_code, 
		  transit_time 
		FROM 
		  public.dc_transit_time x 
		  join global.store_master dc on x.dc_code = dc.store_code 
		  join global.product_mapping_store_dc pmsd on dc.dc_code = pmsd.dc_code 
		  and x.store_code = pmsd.store_code on conflict(mapping_code) do 
		update 
		set 
		  transit_time = excluded.transit_time;
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
