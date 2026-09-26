--liquibase formatted sql
--changeset manas.malik@impactanalytics.co:sync_dc_transit_time_mapping runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_dc_transit_time_mapping
--comment: initial changeset for sync_dc_transit_time_mapping 

DROP PROCEDURE if exists  public.sync_dc_transit_time_mapping();

CREATE OR REPLACE PROCEDURE public.sync_dc_transit_time_mapping()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_transit_time_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO inventory_smart.dc_transit_time_mapping (mapping_code, transit_time, priority)
    SELECT
        mapping_code,
        x.transit_time,
        x.priority
    FROM
        public.dc_transit_time x
        JOIN global.store_master dc ON x.dc_code = dc.store_code
        JOIN global.product_mapping_store_dc pmsd 
            ON dc.dc_code = pmsd.dc_code
            AND x.store_code = pmsd.store_code
    ON CONFLICT (mapping_code) DO NOTHING;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;

