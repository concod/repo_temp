--liquibase formatted sql
--changeset raghav.kirkol@impactanalytics.co:sync_alerts_product_store_level_change_v5 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:figs_sync_alerts_product_store_level
--comment: initial changeset for sync_alerts_product_store_level_change_v5
--rollback: SELECT 1

DROP PROCEDURE if exists  public.sync_alerts_product_level();


CREATE OR REPLACE PROCEDURE public.sync_alerts_product_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
  _log_code varchar := gen_random_uuid();
  _sp_name varchar := 'public.sync_alerts_product_level';
  _log_step varchar;
  _st TIMESTAMP := clock_timestamp();
begin
  call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
  perform set_config('local.log_code', _log_code, true);
  perform set_config('local.sp_name', _sp_name, true);
  begin
    delete from
      inventory_smart.alerts_product_level
    where
      true;
    INSERT INTO inventory_smart.alerts_product_level (
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    l6_name,
    l7_name,
    l8_name,
    article,
    sell_through_perc,
    lw_sales_units,
    wtd_sales_units,
    dc_oh,
    oh_oo_it,
    in_stock_perc,
    wos_oh_oo_it,
    lw_margin_perc,
    lw_revenue,
    wos_oh,
    store_oh,
    store_oo,
    store_it,
    stockout,
    shortfall,
    excess,
    lw_promo,
    lw_aur,
    wtd_revenue,
    wtd_margin,
    wtd_promo,
    wtd_aur,
    dc_it,
    dc_oo,
    dc_oh_it_oo,
    wos_targeted,
    forecast_1week,
    forecast_4weeks,
    l4_weeks_units,
    l8_weeks_units,
    stockout_flag,
    shortfall_flag,
    stockout_is_resolved,
    shortfall_is_resolved,
    excess_flag,
    excess_is_resolved,
    article_orig,
    product_description,
    is_resolved,
    last_4_weeks_actuals,
    deviation_percentage,
    forecast_l4_weeks,
    clearance_product_alert_flag,
    clearance_product_is_resolved,
    excess_stock_alert_flag,
    excess_stock_is_resolved,
    forecast_deviation_is_resolved,
    forecast_deviation_alert_flag,
    new_product_alert_flag,
    new_product_is_resolved,
    forecast_error_perc_flag,
    forecast_error_perc_is_resolved,
    error_percentage,
    color_description,
    accuracy_perc,
    deviation_qty,
    launch_date,
    channel,
    excess_stock_flag,
    s2_name
        )
        SELECT 
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            l6_name,
            l7_name,
            l8_name,
            article,
            sell_through_perc,
            lw_sales_units,
            wtd_sales_units,
            dc_oh,
            oh_oo_it,
            in_stock_perc,
            wos_oh_oo_it,
            lw_margin_perc,
            lw_revenue,
            wos_oh,
            store_oh,
            store_oo,
            store_it,
            stockout,
            shortfall,
            excess,
            lw_promo,
            lw_aur,
            wtd_revenue,
            wtd_margin,
            wtd_promo,
            wtd_aur,
            dc_it,
            dc_oo,
            dc_oh_it_oo,
            wos_targeted,
            forecast_1week,
            forecast_4weeks,
            l4_weeks_units,
            l8_weeks_units,
            stockout_flag,
            shortfall_flag,
            stockout_is_resolved,
            shortfall_is_resolved,
            excess_flag,
            excess_is_resolved,
            article_orig,
            product_description,
            is_resolved,
            last_4_weeks_actuals,
            deviation_percentage,
            forecast_l4_weeks,
            clearance_product_alert_flag,
            clearance_product_is_resolved,
            excess_stock_alert_flag,
            excess_stock_is_resolved,
            forecast_deviation_is_resolved,
            forecast_deviation_alert_flag,
            new_product_alert_flag,
            new_product_is_resolved,
            forecast_error_perc_flag,
            forecast_error_perc_is_resolved,
            error_percentage,
            color_description,
            accuracy_perc,
            deviation_qty,
            launch_date,
            channel,
            excess_stock_flag,
            s2_name
        FROM public.alerts_product_level;
    call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
  exception
    when others then
          call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
  end;
  end;
$procedure$
;