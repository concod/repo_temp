--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:sync_article_inventory_dashboard labels:first commit
--comment: sync_article_inventory_dashboard
--rollback: SELECT 1




DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code VARCHAR := gen_random_uuid();
    _sp_name  VARCHAR := 'public.sync_article_inventory_dashboard';
    _log_step VARCHAR;
    _st       TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(
        _log_code, _sp_name, 'start', NULL,
        (clock_timestamp() - _st)::text, NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Clear existing data
        TRUNCATE TABLE inventory_smart.article_inventory_dashboard;

        -- Insert refreshed data
         INSERT INTO inventory_smart.article_inventory_dashboard (
            l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name,
            article, assortment_indicator, factory_type, intro_date, store_code, sell_through_perc,
            lw_sales_units, wtd_sales_units, dc_oh, store_oh_it_oo, in_stock_perc, wos_oh_oo_it,
            last_8_week_sales, lw_margin_perc, lw_revenue, wos_oh, wos_oh_it, wos_oh_oo,
            store_oh, store_oo, store_it, store_oh_it, stockout, shortfall, excess, normal,
            lw_promo, lw_aur, wtd_revenue, wtd_margin, wtd_promo, wtd_aur, last_allocated_date,
            store_group, dc_oh_it_oo_can, dc_it, dc_oo, lw_aur_can, lw_margin_perc_can,
            lw_promo_can, lw_revenue_can, lw_sales_units_can, wtd_aur_can, wtd_margin_can,
            wtd_promo_can, wtd_revenue_can, wtd_sales_units_can, dc_it_can, dc_oh_can,
            dc_oh_it_oo, dc_oo_can, dc_it_us, dc_oh_us, dc_oh_it_oo_us, dc_oo_us, lw_aur_us,
            lw_margin_perc_us, lw_promo_us, lw_revenue_us, lw_sales_units_us, wtd_aur_us,
            wtd_margin_us, wtd_promo_us, wtd_revenue_us, wtd_sales_units_us, wos_targeted,
            article_status_tag, forecast_1week, forecast_4weeks, l4_weeks_units,l2w_sales,l3w_sales,l5w_sales,l6w_sales,l7w_sales, avg_discount, price,forecast_8weeks,
            l8_weeks_units, stockout_flag, shortfall_flag, stockout_is_resolved, shortfall_is_resolved,
            style_desc, color_code, style_id, size_integrity, store_name, channel, color_name,
            product_reach, product_reach_desc, product_vertical, product_vertical_desc, pack_id,
            dc_canada_oh, dc_canada_it, dc_canada_oo, dc_canada_oh_it_oo,
            dc_canada_ccls_oh, dc_canada_ccls_it, dc_canada_ccls_oo, dc_canada_ccls_oh_it_oo,
            dc_ohio_oh, dc_ohio_it, dc_ohio_oo, dc_ohio_oh_it_oo,
            dc_reynosa_oh, dc_reynosa_it, dc_reynosa_oo, dc_reynosa_oh_it_oo,
            dc_las_vegas_oh, dc_las_vegas_it, dc_las_vegas_oo, dc_las_vegas_oh_it_oo,
            dc_jax_oh, dc_jax_it, dc_jax_oo, dc_jax_oh_it_oo,lms_attribute_value,lms_attributes,store_grade,l1w_sales,l4w_sales,l8w_sales
        )
        SELECT
            x.l0_name, x.l1_name, x.l2_name, x.l3_name, x.l4_name,
            x.l5_name, x.l6_name, x.l7_name, x.l8_name,
            x.article, x.assortment_indicator, x.factory_type, x.intro_date, x.store_code,
            x.sell_through_perc, x.lw_sales_units, x.wtd_sales_units,
            x.dc_oh, x.store_oh_it_oo, x.in_stock_perc, x.wos_oh_oo_it,
            x.last_8_week_sales, x.lw_margin_perc, x.lw_revenue,
            x.wos_oh, x.wos_oh_it, x.wos_oh_oo,
            x.store_oh, x.store_oo, x.store_it, x.store_oh_it,
            x.stockout, x.shortfall, x.excess, x.normal,
            x.lw_promo, x.lw_aur,
            x.wtd_revenue, x.wtd_margin, x.wtd_promo, x.wtd_aur,
            x.last_allocated_date, x.store_group,
            x.dc_oh_it_oo_can, x.dc_it, x.dc_oo,
            x.lw_aur_can, x.lw_margin_perc_can, x.lw_promo_can,
            x.lw_revenue_can, x.lw_sales_units_can,
            x.wtd_aur_can, x.wtd_margin_can, x.wtd_promo_can,
            x.wtd_revenue_can, x.wtd_sales_units_can,
            x.dc_it_can, x.dc_oh_can, x.dc_oh_it_oo, x.dc_oo_can,
            x.dc_it_us, x.dc_oh_us, x.dc_oh_it_oo_us, x.dc_oo_us,
            x.lw_aur_us, x.lw_margin_perc_us, x.lw_promo_us,
            x.lw_revenue_us, x.lw_sales_units_us,
            x.wtd_aur_us, x.wtd_margin_us, x.wtd_promo_us,
            x.wtd_revenue_us, x.wtd_sales_units_us,
            x.wos_targeted, x.article_status_tag,
            x.forecast_1week, x.forecast_4weeks, x.l4_weeks_units,x.l2w_sales,x.l3w_sales,x.l5w_sales,x.l6w_sales,x.l7w_sales, x.avg_discount, x.price,
            x.forecast_8weeks, x.l8_weeks_units,
            x.stockout_flag, x.shortfall_flag,
            x.stockout_is_resolved, x.shortfall_is_resolved,
            x.style_desc, x.color_code, x.style_id, x.size_integrity,
            sm.store_name, x.channel, x.color_name,
            x.product_reach, x.product_reach_desc,
            x.product_vertical, x.product_vertical_desc, x.pack_id,
            x.dc_canada_oh, x.dc_canada_it, x.dc_canada_oo, x.dc_canada_oh_it_oo,
            x.dc_canada_ccls_oh, x.dc_canada_ccls_it, x.dc_canada_ccls_oo, x.dc_canada_ccls_oh_it_oo,
            x.dc_ohio_oh, x.dc_ohio_it, x.dc_ohio_oo, x.dc_ohio_oh_it_oo,
            x.dc_reynosa_oh, x.dc_reynosa_it, x.dc_reynosa_oo, x.dc_reynosa_oh_it_oo,
            x.dc_las_vegas_oh, x.dc_las_vegas_it, x.dc_las_vegas_oo, x.dc_las_vegas_oh_it_oo,
            x.dc_jax_oh, x.dc_jax_it, x.dc_jax_oo, x.dc_jax_oh_it_oo, x.lms_attribute_value,x.lms_attributes,x.store_grade, x.l1w_sales,x.l4w_sales,x.l8w_sales
        FROM public.article_inventory_dashboard x
        JOIN global.store_master sm USING (store_code);


        CALL global.data_ingestion_logs(
            _log_code, _sp_name, 'end', NULL,
            (clock_timestamp() - _st)::text, NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code, _sp_name, _log_step,
                SQLERRM, (clock_timestamp() - _st)::text, NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$;

