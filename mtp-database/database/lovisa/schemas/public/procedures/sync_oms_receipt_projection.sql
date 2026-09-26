--liquibase formatted sql
--changeset sreenivas.s@impactanalytics.co:sync_oms_receipt_projection_test runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_receipt_projection_test

DROP PROCEDURE IF EXISTS public.sync_oms_receipt_projection();

CREATE OR REPLACE PROCEDURE public.sync_oms_receipt_projection()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_receipt_projection';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE TABLE inventory_smart.oms_receipt_projection;
    INSERT INTO inventory_smart.oms_receipt_projection (
        article,
        size,
        product_code,
        vendor_name,
        vendor_code,
        loc_code,
        channel,
        fiscal_year_month,
        fiscal_month_name,
        fiscal_year,
        receipt_quantity,
        receipt_quantity_cost,
        receipt_raw_roq,
        receipt_raw_roq_cost,
        receipt_roq_constrained,
        receipt_roq_constrained_cost
    )
    SELECT
        article,
        size,
        product_code,
        vendor_name,
        vendor_code,
        loc_code,
        channel,
        fiscal_year_month,
        fiscal_month_name,
        fiscal_year,
        receipt_quantity,
        receipt_quantity_cost,
        receipt_raw_roq,
        receipt_raw_roq_cost,
        receipt_roq_constrained,
        receipt_roq_constrained_cost
    FROM public.oms_receipt_projection;
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