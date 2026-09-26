--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_product_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Aggregation by Product/Hierarchy using array_agg for promo_id and fixed planned/spend naming.

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_product_reporting_data;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_product_reporting_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    reporting_table TEXT;
    query TEXT;

BEGIN
    -- Reference to the dynamic source table created in the first step
    reporting_table := CONCAT('ps_reporting_post_promo_date_', TO_CHAR(var_date, 'yyyymmdd'));
    
    -- Ensure hierarchy table partitions exist
    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_reporting_post_hierarchy_date', 'day', '14 day', 'backwards');

    -- Cleanup for re-runability
    DELETE FROM price_promo.ps_reporting_post_hierarchy_date
    WHERE "date" = var_date;

    query := FORMAT(
        'INSERT INTO price_promo.ps_reporting_post_hierarchy_date (
            promo_id, product_id, store_reco_level, customer_reco_level,
            date, fw, fy, week_start_date,
            actual_sales_units, finalized_sales_units, baseline_sales_units,
            actual_revenue, finalized_revenue, baseline_revenue,
            actual_margin, finalized_margin, baseline_margin,
            lw_sales_units, lw_revenue, lw_margin,
            ly_sales_units, ly_revenue, ly_margin,
            actual_discount,
            
            -- Planned Metrics (Corrected Naming)
            actual_planned_units, actual_planned_revenue, actual_planned_margin,
            ly_planned_units, ly_planned_revenue, ly_planned_margin,
            lw_planned_units, lw_planned_revenue, lw_planned_margin,
            
            actual_contribution_revenue, finalized_contribution_revenue, 
            actual_contribution_margin, finalized_contribution_margin,
            lw_contribution_revenue, lw_contribution_margin, 
            ly_contribution_revenue, ly_contribution_margin,
            
            actual_coupon_spend, lw_coupon_spend, ly_coupon_spend,

            -- Spend Metrics (Corrected Naming)
            actual_spend, lw_spend, ly_spend, finalized_spend,
            actual_planned_spend, lw_planned_spend, ly_planned_spend, finalized_promo_spend,
            finalized_coupon_spend, actual_promo_spend
        )
        SELECT
            -- Collects all promo IDs into a sorted array
            array_agg(DISTINCT promo_id ORDER BY promo_id) AS promo_id, 
            product_id, 
            store_reco_level, 
            customer_reco_level,
            date, fw, fy, week_start_date,

            SUM(actual_sales_units) AS actual_sales_units,
            SUM(finalized_sales_units) AS finalized_sales_units,
            SUM(baseline_sales_units) AS baseline_sales_units,
            SUM(actual_revenue) AS actual_revenue,
            SUM(finalized_revenue) AS finalized_revenue,
            SUM(baseline_revenue) AS baseline_revenue,
            SUM(actual_margin) AS actual_margin,
            SUM(finalized_margin) AS finalized_margin,
            SUM(baseline_margin) AS baseline_margin,
            SUM(lw_sales_units) AS lw_sales_units,
            SUM(lw_revenue) AS lw_revenue,
            SUM(lw_margin) AS lw_margin,
            SUM(ly_sales_units) AS ly_sales_units,
            SUM(ly_revenue) AS ly_revenue,
            SUM(ly_margin) AS ly_margin,
            
            AVG(actual_discount) AS actual_discount,

            -- Planned Metrics
            ROUND(SUM(COALESCE(actual_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_planned_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_margin, 0))::NUMERIC, 2),

            -- Contribution Metrics
            ROUND(SUM(COALESCE(actual_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_contribution_margin, 0))::NUMERIC, 2),
            
            SUM(actual_coupon_spend),
            SUM(lw_coupon_spend),
            SUM(ly_coupon_spend),

            -- Spend Metrics
            ROUND(SUM(COALESCE(actual_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_planned_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_promo_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_coupon_spend, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_promo_spend, 0))::NUMERIC, 2)

        FROM price_promo.%I
        GROUP BY product_id, store_reco_level, customer_reco_level, date, fw, fy, week_start_date;', 
        reporting_table
    );

    RAISE NOTICE 'Executing SQL QUERY: %', query;
    EXECUTE query;

END;
$procedure$
;