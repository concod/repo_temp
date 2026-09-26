--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_oms_deep_dive_base_store runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_deep_dive_base_store
--comment: initial changeset sync_oms_deep_dive_base_store 

DROP PROCEDURE IF EXISTS public.sync_oms_deep_dive_base_store(bool);
CREATE OR REPLACE PROCEDURE public.sync_oms_deep_dive_base_store(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_deep_dive_base_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
             delete from 
               inventory_smart.oms_deep_dive_base_store 
             where 
               true;
    end if;
	
   INSERT INTO inventory_smart.oms_deep_dive_base_store 
   (
    product_code,
    store_code,
    fiscal_year_week,
    week,
    "month",
    predicted_qty,
    rolling_std_dev,
    rolling_forecast,
    variance,
    safety_stock,
    receipt1,
    receipt1_qc,
    sales_forecast,
    store_inv,
    lost_sales,
    "style",
    article,
    "size",
    channel,
    vendor_code,
    vendor_name,
    store_tier,
    week_starting,
    week_ending,
    total_mins,
    additional_forecast,
    additional_inventory,
    inventory_deficit,
    ecom_forecast,
    ecom_reserve,
    created_by,
    created_at,
    updated_by,
    updated_at,
    eff_lead_time,
    approved_receipt,
    ly_sales,
    ly_oh,
    total_stores_count,
    total_store_forecast
   )
   SELECT 
      product_code,
    store_code,
    fiscal_year_week,
    week,
    "month",
    predicted_qty,
    rolling_std_dev,
    rolling_forecast,
    variance,
    safety_stock,
    receipt1,
    receipt1_qc,
    sales_forecast,
    store_inv,
    lost_sales,
    "style",
    article,
    "size",
    channel,
    vendor_code,
    vendor_name,
    store_tier,
    week_starting,
    week_ending,
    total_mins,
    additional_forecast,
    additional_inventory,
    inventory_deficit,
    ecom_forecast,
    ecom_reserve,
    created_by,
    created_at,
    updated_by,
    updated_at,
    eff_lead_time,
    approved_receipt,
    ly_sales,
    ly_oh,
    total_stores_count,
    total_store_forecast
   FROM public.oms_deep_dive_base_store
   ON CONFLICT ON CONSTRAINT uk_oms_deep_dive_base_store DO NOTHING;

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
