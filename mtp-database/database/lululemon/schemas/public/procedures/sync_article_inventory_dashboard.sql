
-- liquibase formatted sql
-- changeset raghav.kirkol@impactanalytics.co:sync_article_inventory_dashboard_22 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_article_inventory_dashboard
-- comment: updated logic  for sync_article_inventory_dashboard_22 based on l1_name and s1_name join2

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
 _log_code varchar := gen_random_uuid();
 _sp_name varchar := 'public.sync_article_inventory_dashboard';
 _log_step varchar;
 _st TIMESTAMP := clock_timestamp();
begin
 -- 1. Start Logging
 call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
 perform set_config('local.log_code', _log_code, true);
 perform set_config('local.sp_name', _sp_name, true);
 begin
   _log_step := 'Delete existing data';
  
   -- 2. Clear Destination Table
   delete from
     inventory_smart.article_inventory_dashboard
   where
     true;
   _log_step := 'Insert new data';
   -- 3. Insert Data mapping to the new Schema
   insert into inventory_smart.article_inventory_dashboard (
       l0_name,
       l1_name,
       l2_name,
       l3_name,
       l4_name,
       l5_name,
       l6_name,
       l7_name,
       product_description,
       article,
       article_original,
       store_oh_it_oo,
       dc_oh_it_oo,
       wos_oh_oo_it,
       lw_sales_units,
       wtd_sales_units,
       last_8_week_sales,
       l4_weeks_units,
       l8_weeks_units,
       wtd_revenue,
       wtd_promo,
       lw_margin_perc,
       lw_aur,
       lw_promo,
       wtd_aur,
       wtd_margin,
       dc_oh,
       dc_it,
       dc_oo,
       store_oh,
       store_oo,
       store_it,
       store_oh_it,
       sell_through_perc,
       lw_revenue,
       wos_oh,
       wos_oh_it,
       wos_oh_oo,
       wos_targeted,
       stockout,
       shortfall,
       excess,
       stockout_flag,
       shortfall_flag,
       forecast_1week,
       forecast_4weeks,
       color_code,
       channel,
       in_stock_perc,
       store_code,
       store_name,
       rnk,
       normal,
       size_integrity,
       tot_inv,
       oh_dc,
       s2_name
   )
   SELECT distinct
       paf.l0_name,
       paf.l1_name,
       paf.l2_name,
       paf.l3_name,
       paf.l4_name,
       paf.l5_name,
       paf.l6_name,
       paf.l7_name,
       coalesce(paf.product_description, aid.product_description),
       aid.article,
       aid.article_original,
       aid.store_oh_it_oo,
       aid.dc_oh_it_oo,
       aid.wos_oh_oo_it,
       aid.lw_sales_units,
       aid.wtd_sales_units,
       aid.last_8_week_sales,
       aid.l4_weeks_units,
       aid.l8_weeks_units,
       aid.wtd_revenue,
       aid.wtd_promo,
       aid.lw_margin_perc,
       aid.lw_aur,
       aid.lw_promo,
       aid.wtd_aur,
       aid.wtd_margin,
       aid.dc_oh,
       aid.dc_it,
       aid.dc_oo,
       aid.store_oh,
       aid.store_oo,
       aid.store_it,
       aid.store_oh_it,
       aid.sell_through_perc,
       aid.lw_revenue,
       aid.wos_oh,
       aid.wos_oh_it,
       aid.wos_oh_oo,
       aid.wos_targeted,
       aid.stockout,
       aid.shortfall,
       aid.excess,
       aid.stockout_flag,
       aid.shortfall_flag,
       aid.forecast_1week,
       aid.forecast_4weeks,
       aid.color_code,
       aid.channel,
       aid.in_stock_perc,
       aid.store_code,
       aid.store_name,
       aid.rnk,
       aid.normal,
       aid.size_integrity,
       aid.tot_inv,
       aid.oh_dc,
       aid.s2_name
   FROM
     public.article_inventory_dashboard aid
     LEFT JOIN global.product_attributes_filter paf ON aid.article = paf.article
     LEFT JOIN global.store_attributes_filter saf ON aid.store_code = saf.store_code
   WHERE
     -- Ensure deleted products are excluded
     (paf.is_deleted IS NULL OR paf.is_deleted = false);
   -- 4. End Logging
   call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
 exception
   when others then
         -- Log the error if an exception occurs
         call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
         raise exception 'Error occurred in the procedure: %', SQLERRM;
 end;
end
$procedure$
;

