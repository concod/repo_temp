--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_event_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Aggregating to Event Level with integer event_id and standardized column naming.

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_event_reporting_data;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_event_reporting_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    reporting_table TEXT;
    query TEXT;

BEGIN
    reporting_table := CONCAT('ps_reporting_post_promo_date_', TO_CHAR(var_date, 'yyyymmdd'));
    
    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_reporting_post_event_date', 'day', '14 day', 'backwards');

    DELETE FROM price_promo.ps_reporting_post_event_date
    WHERE "date" = var_date;

    query := FORMAT(
        'INSERT INTO price_promo.ps_reporting_post_event_date (
            event_id, product_id, store_reco_level, customer_reco_level,
            date, fw, fy, week_start_date,
            promo_id,
            actual_sales_units, finalized_sales_units, baseline_sales_units,
            actual_revenue, finalized_revenue, baseline_revenue,
            actual_margin, finalized_margin, baseline_margin,
            lw_sales_units, lw_revenue, lw_margin,
            ly_sales_units, ly_revenue, ly_margin,
            actual_discount,
            
            actual_planned_units, actual_planned_revenue, actual_planned_margin,
            ly_planned_units, ly_planned_revenue, ly_planned_margin,
            lw_planned_units, lw_planned_revenue, lw_planned_margin,
            
            actual_contribution_revenue, finalized_contribution_revenue, 
            actual_contribution_margin, finalized_contribution_margin,
            lw_contribution_revenue, lw_contribution_margin, 
            ly_contribution_revenue, ly_contribution_margin,
            
            actual_coupon_spend, lw_coupon_spend, ly_coupon_spend,

            actual_spend, lw_spend, ly_spend, finalized_spend,
            actual_planned_spend, lw_planned_spend, ly_planned_spend, finalized_promo_spend,
            finalized_coupon_spend, actual_promo_spend
        )
        SELECT
            event_id, 
            product_id, 
            store_reco_level, 
            customer_reco_level,
            date, fw, fy, week_start_date,
    
            array_agg(DISTINCT promo_id ORDER BY promo_id) AS promo_id,
            SUM(actual_sales_units), SUM(finalized_sales_units), SUM(baseline_sales_units),
            SUM(actual_revenue), SUM(finalized_revenue), SUM(baseline_revenue),
            SUM(actual_margin), SUM(finalized_margin), SUM(baseline_margin),
            SUM(lw_sales_units), SUM(lw_revenue), SUM(lw_margin),
            SUM(ly_sales_units), SUM(ly_revenue), SUM(ly_margin),
            
            AVG(actual_discount),

            ROUND(SUM(COALESCE(actual_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_planned_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_planned_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_units, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_planned_margin, 0))::NUMERIC, 2),

            ROUND(SUM(COALESCE(actual_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(actual_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(finalized_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(lw_contribution_margin, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_contribution_revenue, 0))::NUMERIC, 2),
            ROUND(SUM(COALESCE(ly_contribution_margin, 0))::NUMERIC, 2),
            
            SUM(actual_coupon_spend), SUM(lw_coupon_spend), SUM(ly_coupon_spend),

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
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;', 
        reporting_table
    );
    RAISE NOTICE 'Executing SQL QUERY: %', query;
    EXECUTE query;
END;
$procedure$
;