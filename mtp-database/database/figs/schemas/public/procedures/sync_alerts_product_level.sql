--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_alerts_product_store_level_change_v4 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:figs_sync_alerts_product_store_level
--comment: initial changeset for sync_alerts_product_store_level


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
    article ,
    l0_name ,
    l1_name ,
    l2_name ,
    l3_name ,
    l4_name ,
    "style" ,
    product_description ,
    excs_flg ,
    shrtfl_flg ,
    stckout_flg ,
    overstock ,
    shortfall ,
    stockout ,
    normal ,
    oh ,
    it ,
    oo ,
    lw_units ,
    lw_revenue ,
    lw_margin ,
    promo_percentage ,
    wos_oh ,
    size_integrity ,
    week_to_date_sales ,
    last_day_sales ,
    oh_dc ,
    sales_1_ago ,
    sales_2_ago ,
    sales_3_ago ,
    sales_4_ago ,
    sales_5_ago ,
    sales_6_ago ,
    sales_7_ago ,
    sales_8_ago ,
    lw_aur ,
    clearance_alert_flag ,
    newly_launched_alert_flag ,
    retirement_alert_flag ,
    in_stock_percentage ,
    first_sale_date ,
    last_receipt_date ,
    launch_date ,
    lw_price ,
    lw_aps ,
    sell_through_rate ,
    wos_oh_it ,
    forecast_this_wk ,
    forecast_next_week ,
    forecast_4_next_week ,
    forecast_8_next_week ,
    no_of_stores_oh ,
     shrtfl_is_resolved ,
  excs_is_resolved ,
   newly_launched_is_resolved ,
   stckout_is_resolved
        )
        SELECT distinct
            apl.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            apl.l3_name,
            paf.l4_name,
            paf.style_name as style,
            paf.article as product_description,
            apl.excs_flg,
            apl.shrtfl_flg,
            apl.stckout_flg,
            apl.overstock,
            apl.shortfall,
            apl.stockout,
            apl.normal,
            apl.oh,
            apl.it,
            apl.oo,
            apl.lw_units,
            apl.lw_revenue,
            apl.lw_margin,
            apl.promo_percentage,
            apl.wos_oh,
            apl.size_integrity,
            apl.week_to_date_sales,
            apl.last_day_sales,
            apl.oh_dc,
            apl.sales_1_ago,
            apl.sales_2_ago,
            apl.sales_3_ago,
            apl.sales_4_ago,
            apl.sales_5_ago,
            apl.sales_6_ago,
            apl.sales_7_ago,
            apl.sales_8_ago,
            apl.lw_aur,
            apl.clearance_alert_flag,
            apl.newly_launched_alert_flag,
            apl.retirement_alert_flag,
            apl.in_stock_percentage,
            apl.first_sale_date,
            apl.last_receipt_date,
            apl.launch_date,
            apl.lw_price,
            apl.lw_aps,
            apl.sell_through_rate,
            apl.wos_oh_it,
            apl.forecast_this_wk,
            apl.forecast_next_wk,
            apl.forecast_4_next_wk,
            apl.forecast_8_next_wk,
            apl.no_of_stores_oh,
            stckout_is_resolved,
            shrtfl_is_resolved,
             excs_is_resolved,
            newly_launched_is_resolved


        FROM
      public.alerts_product_level apl
          LEFT JOIN global.product_attributes_filter paf ON apl.article = paf.article;
    call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
  exception
    when others then
          -- Log the error if an exception occurs during any part of the procedure
          call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
  end;
  end;
$procedure$
;



