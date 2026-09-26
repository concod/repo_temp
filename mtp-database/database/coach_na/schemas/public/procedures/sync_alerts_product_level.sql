--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:sync_alerts_product_level labels:first commit
--comment: sync_alerts_product_level
--rollback: SELECT 1




DROP PROCEDURE IF EXISTS public.sync_alerts_product_level(bool);


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
            l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name,
            article, assortment_indicator, factory_type, intro_date, lms_attributes, lms_attribute_value,
            sell_through_perc, lw_sales_units, wtd_sales_units, dc_oh, store_oh_it_oo, in_stock_perc,
            wos_oh_oo_it, last_8_week_sales, lw_margin_perc, lw_revenue, wos_oh, wos_oh_it, wos_oh_oo,
            store_oh, store_oo, store_it, store_oh_it, stockout, shortfall, excess, normal, lw_promo,
            lw_aur, wtd_revenue, wtd_margin, wtd_promo, wtd_aur, last_allocated_date, store_group,
            dc_oh_it_oo_can, dc_it, dc_oo, styleid, lw_aur_can, lw_margin_perc_can, lw_promo_can,
            lw_revenue_can, lw_sales_units_can, wtd_aur_can, wtd_margin_can, wtd_promo_can,
            wtd_revenue_can, wtd_sales_units_can, dc_it_can, dc_oh_can, dc_oh_it_oo, dc_oo_can,
            dc_it_us, dc_oh_us, dc_oh_it_oo_us, dc_oo_us, lw_aur_us, lw_margin_perc_us, lw_promo_us,
            lw_revenue_us, lw_sales_units_us, wtd_aur_us, wtd_margin_us, wtd_promo_us, wtd_revenue_us,
            wtd_sales_units_us, wos_targeted, article_status_tag, forecast_1week, forecast_4weeks,
            l4_weeks_units, forecast_8weeks, l8_weeks_units, stockout_flag, shortfall_flag,
            stockout_is_resolved, shortfall_is_resolved, normal_flag, normal_is_resolved, excess_flag,
            excess_is_resolved, article_orig, product_description, is_resolved, last_4_weeks_actuals,
            deviation_percentage, forecast_l4_weeks, clearance_product_alert_flag,
            clearance_product_is_resolved, excess_stock_alert_flag, excess_stock_is_resolved,
            product_group, forecast_deviation_is_resolved, forecast_deviation_alert_flag,
            new_product_alert_flag, new_product_is_resolved, forecast_error_perc_flag,
            forecast_error_perc_is_resolved, error_percentage, color_description, accuracy_perc,
            recently_lanched_products, recently_lanched_products_is_resolved, launch_date, deviation_qty,inseason_alert_accuracy_flag,
	inseason_alert_deviation_flag,new_accuracy_flag,inseason_alert_accuracy_flag_resolved,inseason_alert_deviation_flag_resolved,new_accuracy_flag_resolved,product_vertical,product_vertical_desc,reynosa_dc_alert_flag,reynosa_dc_alert_resolved,product_reach,product_reach_desc
        )
        SELECT
            l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name,
            article, assortment_indicator, factory_type, intro_date, lms_attributes, lms_attribute_value,
            sell_through_perc, lw_sales_units, wtd_sales_units, dc_oh, store_oh_it_oo, in_stock_perc,
            wos_oh_oo_it, last_8_week_sales, lw_margin_perc, lw_revenue, wos_oh, wos_oh_it, wos_oh_oo,
            store_oh, store_oo, store_it, store_oh_it, stockout, shortfall, excess, normal, lw_promo,
            lw_aur, wtd_revenue, wtd_margin, wtd_promo, wtd_aur, last_allocated_date, store_group,
            dc_oh_it_oo_can, dc_it, dc_oo, styleid, lw_aur_can, lw_margin_perc_can, lw_promo_can,
            lw_revenue_can, lw_sales_units_can, wtd_aur_can, wtd_margin_can, wtd_promo_can,
            wtd_revenue_can, wtd_sales_units_can, dc_it_can, dc_oh_can, dc_oh_it_oo, dc_oo_can,
            dc_it_us, dc_oh_us, dc_oh_it_oo_us, dc_oo_us, lw_aur_us, lw_margin_perc_us, lw_promo_us,
            lw_revenue_us, lw_sales_units_us, wtd_aur_us, wtd_margin_us, wtd_promo_us, wtd_revenue_us,
            wtd_sales_units_us, wos_targeted, article_status_tag, forecast_1week, forecast_4weeks,
            l4_weeks_units, forecast_8weeks, l8_weeks_units, stockout_flag, shortfall_flag,
            stockout_is_resolved, shortfall_is_resolved, normal_flag, normal_is_resolved, excess_flag,
            excess_is_resolved, article_orig, product_description, is_resolved, last_4_weeks_actuals,
            deviation_percentage, forecast_l4_weeks, clearance_product_alert_flag,
            clearance_product_is_resolved, excess_stock_alert_flag, excess_stock_is_resolved,
            product_group, forecast_deviation_is_resolved, forecast_deviation_alert_flag,
            new_product_alert_flag, new_product_is_resolved, forecast_error_perc_flag,
            forecast_error_perc_is_resolved, error_percentage, color_description, accuracy_perc,
            recently_lanched_products, recently_lanched_products_is_resolved, launch_date, deviation_qty,inseason_alert_accuracy_flag,
	inseason_alert_deviation_flag,new_accuracy_flag,inseason_alert_accuracy_flag_resolved,inseason_alert_deviation_flag_resolved,new_accuracy_flag_resolved,product_vertical,product_vertical_desc,reynosa_dc_alert_flag,reynosa_dc_alert_resolved,product_reach,product_reach_desc
        FROM
          public.alerts_product_level;
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
