--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:alert_product_store_level runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_article_instock
--comment: initial changeset for alert_product_store_level

DROP PROCEDURE IF EXISTS public.sync_alert_product_store_level();


CREATE OR REPLACE PROCEDURE public.sync_alert_product_store_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alert_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

  -- Step 1: Clear target table
  DELETE FROM inventory_smart.alerts_product_store_level
  WHERE TRUE;

  -- Step 2: Insert data from public schema
  INSERT INTO inventory_smart.alerts_product_store_level (
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    article,
    season,
    style_description,
    collection,
    store_code,
    s0_name,
    country,
    region,
    lw_units,
    lw_margin,
    lw_revenue,
    l4w_units,
    l4w_revenue,
    l8w_units,
    discount,
    stockout,
    shortfall,
    excess,
    normal,
    sell_through_perc,
    ata_eaches,
    ata_packs,
    ata,
    dc_instock,
    dc_oo,
    in_stock,
    in_stock_ata,
    allocated_units,
    wos_oh_oo_it,
    wos_oh_oo,
    wos_oh,
    launch_date,
    clearance,
    price,
    msrp,
    oh,
    it,
    oo,
    total_inv,
    overstock_most_stores_alert,
    shortfall_most_stores_alert,
    stockout_most_stores_alert,
    cfc_age_weeks,
    cfc_age_gt_5_alert,
    cfc_age_gt_10_alert,
    cfc_age_gt_20_alert
  )
  SELECT
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    article,
    season,
    style_description,
    collection,
    store_code,
    s0_name,
    country,
    region,
    lw_units,
    lw_margin,
    lw_revenue,
    l4w_units,
    l4w_revenue,
    l8w_units,
    discount,
    stockout,
    shortfall,
    excess,
    normal,
    sell_through_perc,
    ata_eaches,
    ata_packs,
    ata,
    dc_instock,
    dc_oo,
    in_stock,
    in_stock_ata,
    allocated_units,
    wos_oh_oo_it,
    wos_oh_oo,
    wos_oh,
    launch_date,
    clearance,
    price,
    msrp,
    oh,
    it,
    oo,
    total_inv,
    overstock_most_stores_alert,
    shortfall_most_stores_alert,
    stockout_most_stores_alert,
    cfc_age_weeks,
    cfc_age_gt_5_alert,
    cfc_age_gt_10_alert,
    cfc_age_gt_20_alert
  FROM public.alerts_product_store_level;
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
