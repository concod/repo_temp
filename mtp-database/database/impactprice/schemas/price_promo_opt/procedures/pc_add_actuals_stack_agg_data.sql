--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_stack_agg_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_actuals_stack_agg_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_actuals_stack_agg_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_stack_agg_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    actuals_table TEXT;
    query TEXT;
BEGIN
    -- 1. Construct the partitioned table name
    actuals_table := CONCAT('ps_recommended_actuals_', TO_CHAR(var_date, 'yyyymmdd'));

    -- 2. Create a temporary table to aggregate metrics at the unique product/store/customer level
    -- This handles de-duplication across the stack for specific line items
    EXECUTE FORMAT(
        'DROP TABLE IF EXISTS price_promo_opt_temp.ps_reco_actuals_stack_temp;
         CREATE UNLOGGED TABLE price_promo_opt_temp.ps_reco_actuals_stack_temp AS
         SELECT
            event_id,
            product_id,
            store_reco_level,
            customer_reco_level,
            recommendation_date,
            currency_id,
            array_agg(distinct promo_id order by promo_id) AS promo_ids,
            MAX(discount_level_value) AS discount_level_value,
            MAX(offer_type_combined_display_name) AS offer_type_combined_display_name,
            MAX(effective_discount) AS effective_discount,
            AVG(original_price) AS original_price,
            AVG(original_cost) AS original_cost,
            AVG(discounted_price) AS discounted_price,
            MAX(promo_spend) AS promo_spend,
            MAX(coupon_spend) AS coupon_spend,
            MAX(price_spend) AS price_spend, 
            MAX(sales_units) AS sales_units,
            MAX(baseline_sales_units) AS baseline_sales_units,
            MAX(incremental_sales_units) AS incremental_sales_units,
            MAX(revenue) AS revenue,
            MAX(baseline_revenue) AS baseline_revenue,
            MAX(incremental_revenue) AS incremental_revenue,
            MAX(margin) AS margin,
            MAX(baseline_margin) AS baseline_margin,
            MAX(incremental_margin) AS incremental_margin,
            MAX(vat_percentage) AS vat_percentage,
            MAX(created_by) AS created_by,
            MAX(updated_by) AS updated_by,
            MAX(created_at) AS created_at,
            MAX(updated_at) AS updated_at,
            MAX(contribution_revenue) AS contribution_revenue,
            MAX(contribution_margin) AS contribution_margin
         FROM price_promo.%I pra
         GROUP BY 1, 2, 3, 4, 5, 6;',
        actuals_table
    );

    -- 3. Delete existing records for the target date
    DELETE FROM price_promo.ps_recommended_actuals_stack_agg
    WHERE recommendation_date = var_date;

    -- 4. Final Aggregation into the Stacked Target Table
    query := 'INSERT INTO price_promo.ps_recommended_actuals_stack_agg (
            event_id, 
            promo_ids, 
            recommendation_date, 
            currency_id, 
            vat_percentage,
            discount_level_value, 
            offer_type_combined_display_name,
            effective_discount, 
            original_price, 
            original_cost, 
            discounted_price, 
            promo_spend,
            coupon_spend,
            price_spend,
            sales_units, 
            baseline_sales_units, 
            incremental_sales_units,
            revenue, 
            baseline_revenue, 
            incremental_revenue,
            margin, 
            baseline_margin, 
            incremental_margin,
            created_by, 
            updated_by, 
            created_at, 
            updated_at,
            contribution_revenue, 
            contribution_margin
        )
        SELECT
            event_id,
            promo_ids,
            recommendation_date,
            COALESCE(currency_id, 1) AS currency_id,
            MAX(vat_percentage) AS vat_percentage,
            MAX(discount_level_value) AS discount_level_value,
            MAX(offer_type_combined_display_name) AS offer_type_combined_display_name,
            ROUND(((1 - COALESCE(SUM(discounted_price) / NULLIF(SUM(original_price), 0), 1)) * 100)::NUMERIC, 2) AS effective_discount,
            ROUND(AVG(original_price)::NUMERIC, 2) AS original_price,
            ROUND(AVG(original_cost)::NUMERIC, 2) AS original_cost,
            ROUND(AVG(discounted_price)::NUMERIC, 2) AS discounted_price,
            ROUND(SUM(promo_spend)::NUMERIC, 2) AS promo_spend,
            ROUND(SUM(coupon_spend)::NUMERIC, 2) AS coupon_spend,
            ROUND(SUM(price_spend)::NUMERIC, 2) AS price_spend,
            ROUND(SUM(sales_units)::NUMERIC, 2) AS sales_units,
            ROUND(SUM(baseline_sales_units)::NUMERIC, 2) AS baseline_sales_units,
            ROUND(SUM(incremental_sales_units)::NUMERIC, 2) AS incremental_sales_units,
            ROUND(SUM(revenue)::NUMERIC, 2) AS revenue,
            ROUND(SUM(baseline_revenue)::NUMERIC, 2) AS baseline_revenue,
            ROUND(SUM(incremental_revenue)::NUMERIC, 2) AS incremental_revenue,
            ROUND(SUM(margin)::NUMERIC, 2) AS margin,
            ROUND(SUM(baseline_margin)::NUMERIC, 2) AS baseline_margin,
            ROUND(SUM(incremental_margin)::NUMERIC, 2) AS incremental_margin,
            MAX(created_by) AS created_by,
            MAX(updated_by) AS updated_by,
            MAX(created_at) AS created_at,
            MAX(updated_at) AS updated_at,
            ROUND(SUM(COALESCE(contribution_revenue, 0))::NUMERIC, 2) AS contribution_revenue,
            ROUND(SUM(COALESCE(contribution_margin, 0))::NUMERIC, 2) AS contribution_margin
        FROM price_promo_opt_temp.ps_reco_actuals_stack_temp
        GROUP BY
            event_id,
            promo_ids,
            recommendation_date,
            currency_id;';

    RAISE NOTICE 'Executing Stack Aggregation for date: % and query : %', var_date, query;
    EXECUTE query;

END;
$procedure$
;
