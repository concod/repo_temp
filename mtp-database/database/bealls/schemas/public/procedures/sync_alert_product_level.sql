--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:alert_product_level runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_article_instock
--comment: initial changeset for alert_product_level

DROP PROCEDURE IF EXISTS public.sync_alert_product_level();

CREATE OR REPLACE PROCEDURE public.sync_alert_product_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alert_product_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

  /* -------------------------------------------------- */
  /* Step 1: Clear target table                         */
  /* -------------------------------------------------- */
  DELETE FROM inventory_smart.alerts_product_level
  WHERE TRUE;

  /* -------------------------------------------------- */
  /* Step 2: Insert fresh article-level alert data      */
  /* -------------------------------------------------- */
  INSERT INTO inventory_smart.alerts_product_level (
    l0_name,
    l1_name,
    article,
    l2_name,
    l3_name,
    l4_name,
    season,
    l5_name,
    collection,
    product_type,
    launch_date,
    clearance_flag,

    overstock_flag,
    understock_flag,
    stockout_flag,
    cfc_age_gt_5_alert,
    cfc_age_gt_10_alert,
    cfc_age_gt_20_alert,

    overstock_total_wos,
    overstock_style_life_cycle,
    overstock_net_dc_available_incoming,

    understock_total_wos,
    understock_style_life_cycle,
    understock_net_dc_available_incoming,

    stockout_instock_per,
    stockout_ata,
    stockout_str_oh,

    cfc_gt_5_stores,
    cfc_gt_10_stores,
    cfc_gt_20_stores
  )
  SELECT
    l0_name,
    l1_name,
    article,
    l2_name,
    l3_name,
    l4_name,
    season,
    l5_name,
    collection,
    product_type,
    launch_date,
    clearance_flag,

    overstock_flag,
    understock_flag,
    stockout_flag,
    cfc_age_gt_5_alert,
    cfc_age_gt_10_alert,
    cfc_age_gt_20_alert,

    overstock_total_wos,
    overstock_style_life_cycle,
    overstock_net_dc_available_incoming,

    understock_total_wos,
    understock_style_life_cycle,
    understock_net_dc_available_incoming,

    stockout_instock_per,
    stockout_ata,
    stockout_str_oh,

    cfc_gt_5_stores,
    cfc_gt_10_stores,
    cfc_gt_20_stores
  FROM public.alerts_product_level;

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

