-- liquibase formatted sql
-- changeset keerthi.vardhani@impactanalytics.co:sync_article_inventory_dashboard_v10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_sync_article_inventory_dashboard
-- comment: initial changeset for sync_article_inventory_dashboard

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
  call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
  perform set_config('local.log_code', _log_code, true);
  perform set_config('local.sp_name', _sp_name, true);
  begin
    delete from 
      inventory_smart.article_inventory_dashboard
    where 
      true;
insert into inventory_smart.article_inventory_dashboard (
            article,
            store_code,
            channel,
            channel_name,
            product_description,
            oh,
            it,
            oo,
            tot_inv,
            lw_units,
            lw_revenue,
            lw_margin,
            lw_discount_amount,
            lw_discount_percentage,
            promo_percentage,
            wos_oh,
            store_level_prediction,
            size_integrity,
            total_count,
            in_stock,
            in_stock_count,
            overstock,
            normal,
            shortfall,
            stockout,
            available_stores_percentage,
            week_to_date_sales,
            last_day_sales,
            oh_dc,
            oo_dc,
            dc_oo_po,
            it_dc,
            sales_1_ago,
            sales_2_ago,
            sales_3_ago,
            sales_4_ago,
            sales_5_ago,
            sales_6_ago,
            sales_7_ago,
            sales_8_ago,
            aur,
            sell_through_rate,
            style_color_status,
            dc_available,
            dc_oo,
            dc_oo_30_days,
            in_stock_percentage,
            first_sale_date,
            last_receipt_date,
            lw_store_units,
            lw_sfs_units,
            lw_price,
            lw_aur,
            lw_aps,
            fwos,
            wos_oh_it,
            hybrid_wos,
            hybrid_wos_oh_it,
            upas,
            forecast_this_wk,
            forecast_next_wk,
            forecast_4_next_wk,
            forecast_8_next_wk,
            mfp_forecast_4_next_wk ,
           next_4wks_promo_pct ,
            past_4wks_actual_sales ,
            forecast_deviation_pct ,
           past_4wks_store_count ,
           next_4wks_store_count ,
           store_count_deviation_pct ,
           past_4wks_promo_pct ,
           promo_deviation_pct ,
           ly_past_4wks_actual_sales ,
           ly_next_4wks_actual_sales ,
            ly_deviation_pct ,
            no_of_stores_oh,
            store_name,
            style_name,
            color_name,
            -- paf.style_name,
            color_id,
            style_type,
            f_style_fabric,
            replenish_status,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            article_status_tag,
            last_allocated_date,
             twos
    ) 
    SELECT distinct
            aid.article,
            aid.store_code,
            aid.channel,
            aid.channel_name,
            paf.article as product_description,
            aid.oh,
            aid.it,
            aid.oo,
            aid.tot_inv,
            aid.lw_units,
            aid.lw_revenue,
            aid.lw_margin,
            aid.lw_discount_amount,
            aid.lw_discount_percentage,
            aid.promo_percentage,
            aid.wos_oh,
            aid.store_level_prediction,
            aid.size_integrity,
            aid.total_count,
            aid.in_stock,
            aid.in_stock_count,
            aid.overstock,
            aid.normal,
            aid.shortfall,
            aid.stockout,
            aid.available_stores_percentage,
            aid.week_to_date_sales,
            aid.last_day_sales,
            aid.oh_dc,
            aid.oo_dc,
            aid.dc_oo_po,
            aid.it_dc,
            aid.sales_1_ago,
            aid.sales_2_ago,
            aid.sales_3_ago,
            aid.sales_4_ago,
            aid.sales_5_ago,
            aid.sales_6_ago,
            aid.sales_7_ago,
            aid.sales_8_ago,
--            (coalesce(aid.sales_1_ago,0)+coalesce(aid.sales_2_ago,0)+coalesce(aid.sales_3_ago,0)+coalesce(aid.sales_4_ago,0)) as L4W_sales,
--            (coalesce(aid.sales_1_ago,0)+coalesce(aid.sales_2_ago,0)+coalesce(aid.sales_3_ago,0)+coalesce(aid.sales_4_ago,0)+coalesce(aid.sales_5_ago,0)+coalesce(aid.sales_6_ago,0)+coalesce(aid.sales_7_ago,0)+coalesce(aid.sales_8_ago,0)) as L8W_sales,
            aid.lw_aur as aur,
            aid.sell_through_rate,
            aid.style_color_status,
            aid.dc_available,
            aid.dc_oo,
            aid.dc_oo_30_days,
            aid.in_stock_percentage,
            aid.first_sale_date,
            aid.last_receipt_date,
            aid.lw_store_units,
            aid.lw_sfs_units,
            aid.lw_price,
            aid.lw_aur,
            aid.lw_aps,
            -- aid.it_allocated,
            -- aid.it_shipped,
            -- aid.it_store_to_store,
            aid.fwos,
            aid.wos_oh_it,
            aid.hybrid_wos,
            aid.hybrid_wos_oh_it,
            aid.upas,
            aid.forecast_this_wk,
            aid.forecast_next_wk,
            aid.forecast_4_next_wk,
            aid.forecast_8_next_wk,
             aid.mfp_forecast_4_next_wk ,
           aid.next_4wks_promo_pct ,
            aid.past_4wks_actual_sales ,
            aid.forecast_deviation_pct ,
           aid.past_4wks_store_count ,
           aid.next_4wks_store_count ,
           aid.store_count_deviation_pct ,
           aid.past_4wks_promo_pct ,
           aid.promo_deviation_pct ,
           aid.ly_past_4wks_actual_sales ,
           aid.ly_next_4wks_actual_sales ,
            aid.ly_deviation_pct ,
            aid.no_of_stores_oh,
            -- aid.store_tier,
            aid.store_name,
            paf.style_name,
            paf.color_id ,
            paf.color_id as color_name,
            paf.style_type,
            paf.f_style_fabric,
            paf.replenish_status,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            aid.l3_name,
             aid.l4_name,
            aid.article_status_tag,
            aid.last_allocated_date,
            aid.twos
    FROM 
      public.article_inventory_dashboard aid
      LEFT JOIN (select * from global.product_attributes_filter where active and not is_deleted) paf ON aid.article = paf.article      
    LEFT JOIN (select * from global.store_attributes_filter where active and not is_deleted) saf using(store_code)
    left join (select article,store_code,avg(wos) as twos from inventory_smart.final_result_table frt 
        join global.product_attributes_filter using(product_code)
        group by 1,2) frt on aid.article=frt.article and aid.store_code=frt.store_code;
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