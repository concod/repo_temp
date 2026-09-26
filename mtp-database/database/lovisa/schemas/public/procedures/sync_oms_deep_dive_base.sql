-- liquibase formatted sql
-- changeset swapnil.bhange@impactanalytics.co:sync_oms_deep_dive_base_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_oms_deep_dive_base
-- comment: SP for oms_deep_dive_base_v3

DROP  PROCEDURE if exists public.sync_oms_deep_dive_base();
DROP  PROCEDURE if exists public.sync_oms_deep_dive_base(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_deep_dive_base(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_oms_deep_dive_base';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        IF _is_historic THEN
            _log_step := 'truncate old data';
            TRUNCATE TABLE inventory_smart.oms_deep_dive_base RESTART IDENTITY;
        END IF;

        _log_step := 'insert/upsert step';

        INSERT INTO inventory_smart.oms_deep_dive_base (
            product_code, style, article, size, channel,
            vendor_code, vendor_name, loc_code, fiscal_year_week, week, month,
            predicted_qty, eff_lead_time, rolling_std_dev, rolling_forecast, variance,
            safety_stock, receipt1, receipt1_qc, total_dc_forecast, dc_inv,
            total_mins, additional_forecast, additional_inventory, approved_receipt,
            lost_sales, inventory_deficit, ecom_forecast, ecom_reserve,
            created_by, created_at, updated_by, updated_at, id,
            ly_sales, ly_oh, total_dc_forecast_final_roq, total_stores_count
        )
        SELECT
            src.product_code, src.style, src.article, src.size, src.channel,
            src.vendor_code, src.vendor_name, src.loc_code, src.fiscal_year_week,
            CAST(src.week AS date) AS week, src.month,
            src.predicted_qty, src.eff_lead_time, src.rolling_std_dev, src.rolling_forecast, src.variance,
            src.safety_stock, src.receipt1, src.receipt1_qc, src.total_dc_forecast, src.dc_inv,
            src.total_mins, src.additional_forecast, src.additional_inventory, src.approved_receipt,
            src.lost_sales, src.inventory_deficit, src.ecom_forecast, src.ecom_reserve,
            src.created_by, src.created_at, 251, current_timestamp,
            nextval('inventory_smart.oms_deep_dive_base_id_seq'),
            src.ly_sales, 0, src.total_dc_forecast_final_roq, total_stores_count
        FROM public.oms_deep_dive_base src
        ON CONFLICT (product_code, vendor_code, loc_code, fiscal_year_week)
        DO UPDATE SET
            vendor_name = EXCLUDED.vendor_name,
            week = EXCLUDED.week,
            month = EXCLUDED.month,
            predicted_qty = EXCLUDED.predicted_qty,
            eff_lead_time = EXCLUDED.eff_lead_time,
            rolling_std_dev = EXCLUDED.rolling_std_dev,
            rolling_forecast = EXCLUDED.rolling_forecast,
            variance = EXCLUDED.variance,
            safety_stock = EXCLUDED.safety_stock,
            receipt1 = EXCLUDED.receipt1,
            receipt1_qc = EXCLUDED.receipt1_qc,
            total_dc_forecast = EXCLUDED.total_dc_forecast,
            dc_inv = EXCLUDED.dc_inv,
            total_mins = EXCLUDED.total_mins,
            additional_forecast = EXCLUDED.additional_forecast,
            additional_inventory = EXCLUDED.additional_inventory,
            approved_receipt = EXCLUDED.approved_receipt,
            lost_sales = EXCLUDED.lost_sales,
            inventory_deficit = EXCLUDED.inventory_deficit,
            ecom_forecast = EXCLUDED.ecom_forecast,
            ecom_reserve = EXCLUDED.ecom_reserve,
            updated_by = 251,
            updated_at = current_timestamp;

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION WHEN OTHERS THEN
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
        RAISE EXCEPTION 'Error occurred in procedure % at step %: %', _sp_name, _log_step, SQLERRM;
    END;
END;
$procedure$
;
