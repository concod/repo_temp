--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:sync_oms_deep_dive_base runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_deep_dive_base

DROP PROCEDURE IF EXISTS public.sync_oms_deep_dive_base(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_deep_dive_base(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_oms_deep_dive_base';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin
  
   if _is_historic then 
             delete from 
               inventory_smart.oms_deep_dive_base 
             where 
               true;
         end if;
   INSERT INTO inventory_smart.oms_deep_dive_base
(
    product_code,
    style,
    article,
    size,
    channel,
    vendor_code,
    vendor_name,
    loc_code,
    fiscal_year_week,
    week,  
    month,
    predicted_qty,
    eff_lead_time,
    rolling_std_dev,
    rolling_forecast,
    variance,
    safety_stock,
    receipt1,
    receipt1_qc,
    total_dc_forecast,
    dc_inv,
    total_mins,
    additional_forecast,
    additional_inventory,
    approved_receipt,
    lost_sales,
    inventory_deficit,
    ecom_forecast,
    ecom_reserve,
    week_starting,
    week_ending,
    created_by,
    created_at,
    updated_by,
    updated_at,
    approved_receipt_1,
    total_dc_forecast_final_roq,
    ly_sales,
    ly_oh,
    total_stores_count
)
SELECT
    product_code,
    style,
    article,
    size,
    channel,
    vendor_code,
    vendor_name,
    loc_code,
    fiscal_year_week,
    CAST(week AS DATE) AS week,  
    month,
    predicted_qty,
    eff_lead_time,
    rolling_std_dev,
    rolling_forecast,
    variance,
    safety_stock,
    receipt1,
    receipt1_qc,
    total_dc_forecast,
    dc_inv,
    total_mins,
    additional_forecast,
    additional_inventory,
    approved_receipt,
    lost_sales,
    inventory_deficit,
    ecom_forecast,
    ecom_reserve,
    CAST(week_starting AS DATE) AS week_starting,
    CAST(week_ending AS DATE) AS week_ending,    
    created_by,
    created_at,
    updated_by,
    NULL AS updated_at,
    approved_receipt_1,
    total_dc_forecast_final_roq,
    ly_sales,
    ly_oh,
    total_stores_count
FROM public.oms_deep_dive_base
ON CONFLICT ON CONSTRAINT uk_oms_deep_dive_base DO NOTHING;

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
