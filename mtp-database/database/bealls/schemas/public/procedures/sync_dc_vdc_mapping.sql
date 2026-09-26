--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_article_inventory_dashboard
--comment: initial changeset for dc_vdc_mapping

DROP PROCEDURE IF EXISTS public.sync_dc_vdc_mapping();

CREATE OR REPLACE PROCEDURE public.sync_dc_vdc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_vdc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

--delete
    DELETE FROM inventory_smart.dc_vdc_mapping;

-- inserting data 
    INSERT INTO inventory_smart.dc_vdc_mapping (
        store_code,
        dc_code,
        transit_time,
        created_timestamp,
        updated_timestamp,
        holding_transportation_cost,
        distance,
        order_cycle_time,
        virtual_dc
    )
    SELECT
        store_code,
        dc_code,
        transit_time,
        COALESCE(created_timestamp, now()) AS created_timestamp,
        now() AS updated_timestamp,
        holding_transportation_cost,
        distance,
        order_cycle_time,
        virtual_dc
    FROM public.dc_vdc_mapping;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;