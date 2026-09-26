--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_agg_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_actuals_agg_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_actuals_agg_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_agg_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    actuals_table TEXT;
    query TEXT;
BEGIN
    -- 1. Construct the partitioned table name for the specific date
    actuals_table := CONCAT('ps_recommended_actuals_', TO_CHAR(var_date, 'yyyymmdd'));

    -- 2. Ensure partitions exist and clean up existing data for this date
    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_recommended_actuals_agg', 'day', '14 day', 'backwards');

    DELETE FROM price_promo.ps_recommended_actuals_agg
    WHERE recommendation_date = var_date;

    -- 3. Dynamic Aggregation Query
    query := FORMAT(
        'INSERT INTO price_promo.ps_recommended_actuals_agg (
            event_id, 
            promo_id, 
            recommendation_date,
            currency_id, 
            vat_percentage,
            discount_level_value, 
            offer_type_id, 
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
            promo_id, 
            recommendation_date, 
            COALESCE(currency_id, 1) as currency_id,
            MAX(vat_percentage) as vat_percentage,
            MAX(discount_level_value) as discount_level_value, 
            MAX(offer_type_id) as offer_type_id, 
            MAX(offer_type_combined_display_name) as offer_type_combined_display_name,
            ROUND(((1 - COALESCE(SUM(discounted_price) / NULLIF(SUM(original_price), 0), 1)) * 100)::numeric, 2) as effective_discount,
            ROUND(AVG(original_price)::numeric, 2) as original_price,
            ROUND(AVG(original_cost)::numeric, 2) as original_cost,
            ROUND(AVG(discounted_price)::numeric, 2) as discounted_price,
            ROUND(SUM(promo_spend)::numeric, 2) as promo_spend,
            ROUND(SUM(coupon_spend)::numeric, 2) as coupon_spend,
            ROUND(SUM(price_spend)::numeric, 2) as price_spend, -- Mapped to price_spend
            ROUND(SUM(sales_units)::numeric, 2) as sales_units,
            ROUND(SUM(baseline_sales_units)::numeric, 2) as baseline_sales_units,
            ROUND(SUM(incremental_sales_units)::numeric, 2) as incremental_sales_units,
            ROUND(SUM(revenue)::numeric, 2) as revenue,
            ROUND(SUM(baseline_revenue)::numeric, 2) as baseline_revenue,
            ROUND(SUM(incremental_revenue)::numeric, 2) as incremental_revenue,
            ROUND(SUM(margin)::numeric, 2) as margin,
            ROUND(SUM(baseline_margin)::numeric, 2) as baseline_margin,
            ROUND(SUM(incremental_margin)::numeric, 2) as incremental_margin,
            MAX(created_by) as created_by,
            MAX(updated_by) as updated_by,
            MAX(created_at) as created_at,
            MAX(updated_at) as updated_at,
            ROUND(SUM(COALESCE(contribution_revenue, 0))::numeric, 2) as contribution_revenue,
            ROUND(SUM(COALESCE(contribution_margin, 0))::numeric, 2) as contribution_margin
        FROM
            price_promo.%I
        GROUP BY
            event_id, 
            promo_id, 
            recommendation_date, 
            COALESCE(currency_id, 1);', 
        actuals_table
    );

    RAISE NOTICE 'Executing Aggregation for date: % and query : %', var_date, query;
    EXECUTE query;

END;
$procedure$
;
