--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sync_alerts_config_data runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-64
--comment: initial changeset for sync_alerts_config_data
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS inventory_smart.sync_alerts_config_data();
CREATE OR REPLACE PROCEDURE inventory_smart.sync_alerts_config_data()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.sync_alerts_config_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE TABLE inventory_smart.alerts_config_table;

    INSERT INTO inventory_smart.alerts_config_table (
        article,
        product_lifecycle,
        channel,
        alert_name,
        start_date,
        launch_floorset,
        floorset_start_date,
        floorset_end_date,
        ship_date,
        delta,
        buffer,
        alert_start_date,
        alert_end_date,
        plan_id,
        promised_reco_days,
        end_date,
        lead_time
    )
    SELECT
        choice as article,
        l1_name AS product_lifecycle,        
        channel,
        alert_name,
        start_date,
        floorset AS launch_floorset,
        FS_startdate AS floorset_start_date,
        FS_enddate AS floorset_end_date,
        ship_date,
        delta,
        buffer,
        alert_start_date,
        alert_end_date,
        NULL AS plan_id,                 
        promised_reco_days,
        end_date,
        lead_time
    FROM public.alerts_config_table;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
