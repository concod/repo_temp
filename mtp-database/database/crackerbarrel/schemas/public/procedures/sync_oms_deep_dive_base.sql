-- liquibase formatted sql
-- changeset pruthviraj.savanur@impactanalytics.co:sync_oms_deep_dive_base_cb_test_total_stores_count runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_status
-- comment: initial changeset for sync_oms_deep_dive_base for cb test new change added new total_stores_count added now


DROP PROCEDURE if exists public.sync_oms_deep_dive_base(bool);

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
INSERT INTO
  inventory_smart.oms_deep_dive_base (
  	product_code,
    "style",
    article,
    "size",
    channel,
    vendor_code,
    vendor_name,
    loc_code,
    fiscal_year_week,
    week,
    "month",
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
    created_by,
    created_at,
    updated_by,
    updated_at,
    ly_sales,
    ly_oh,
    total_dc_forecast_final_roq,
    total_stores_count
  )
SELECT
  src.product_code,
  src."style",
  src.article,
  src."size",
  src.channel,
  src.vendor_code,
  src.vendor_name,
  src.loc_code,
  src.fiscal_year_week,
  cast(src.week as date) as week,
  src."month",
  src.predicted_qty,
  src.eff_lead_time,
  src.rolling_std_dev,
  src.rolling_forecast,
  src.variance,
  src.safety_stock,
  src.receipt1,
  src.receipt1_qc,
  src.total_dc_forecast,
  src.dc_inv,
  src.total_mins,
  src.additional_forecast,
  src.additional_inventory,
  src.approved_receipt,
  src.lost_sales,
  src.inventory_deficit,
  src.ecom_forecast,
  src.ecom_reserve,
  src.created_by,
  src.created_at,
  112 as updated_by,
  current_timestamp as updated_at,
  src.ly_sales,
  src.ly_oh,
  src.total_dc_forecast_final_roq,
  src.total_stores_count
FROM
  public.oms_deep_dive_base AS src
ON
  CONFLICT (product_code,
    loc_code,
    fiscal_year_week) DO
UPDATE
SET
  vendor_name=EXCLUDED.vendor_name,
  week=EXCLUDED.week,
  "month"=EXCLUDED."month",
  predicted_qty=EXCLUDED.predicted_qty,
  eff_lead_time=EXCLUDED.eff_lead_time,
  rolling_std_dev=EXCLUDED.rolling_std_dev,
  rolling_forecast=EXCLUDED.rolling_forecast,
  variance=EXCLUDED.variance,
  safety_stock=EXCLUDED.safety_stock,
  receipt1=EXCLUDED.receipt1,
  receipt1_qc=EXCLUDED.receipt1_qc,
  total_dc_forecast=EXCLUDED.total_dc_forecast,
  dc_inv=EXCLUDED.dc_inv,
  total_mins=EXCLUDED.total_mins,
  additional_forecast=EXCLUDED.additional_forecast,
  additional_inventory=EXCLUDED.additional_inventory,
  approved_receipt=EXCLUDED.approved_receipt,
  lost_sales=EXCLUDED.lost_sales,
  inventory_deficit=EXCLUDED.inventory_deficit,
  ecom_forecast=EXCLUDED.ecom_forecast,
  ecom_reserve=EXCLUDED.ecom_reserve,
 -- id=EXCLUDED.id,
  created_by=EXCLUDED.created_by,
  created_at=EXCLUDED.created_at,
  updated_by=112, 
  updated_at=current_timestamp,
  ly_sales=EXCLUDED.ly_sales,
  ly_oh=EXCLUDED.ly_oh,
  total_dc_forecast_final_roq=EXCLUDED.total_dc_forecast_final_roq,
  total_stores_count=EXCLUDED.total_stores_count;
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
