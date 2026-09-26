--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:optimization_stack_agg_date_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for optimization_stack_agg_date_procedure

DROP PROCEDURE if exists price_promo_opt.optimization_stack_agg_date_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.optimization_stack_agg_date_procedure(IN var_promo_id integer, IN var_recommendation_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_row_count bigint;
BEGIN
    -- Delete existing agg data for this promo + date
    DELETE FROM price_promo.ps_recommended_stack_ia_agg
    WHERE promo_id = var_promo_id
      AND recommendation_date = var_recommendation_date;

    -- Insert aggregated data for this date
    INSERT INTO price_promo.ps_recommended_stack_ia_agg (
        event_id, promo_id, currency_id, recommendation_date,
        discount_level_value, offer_type_combined_display_name,
        effective_discount, original_cost, discounted_price,
        promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
        revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin,
        margin_wo_vf, scan_back, off_invoice, tot_vendor_fund,
        affinity_revenue, cannibalization_revenue, pull_forward_revenue,
        affinity_margin, cannibalization_margin, pull_forward_margin,
        created_by, updated_by, created_at, updated_at,
        contribution_margin, contribution_revenue, coupon_spend
    )
    SELECT
        event_id, promo_id, currency_id, recommendation_date,
        MAX(discount_level_value) AS discount_level_value,
        NULL::varchar AS offer_type_combined_display_name,
        AVG(effective_discount) AS effective_discount,
        AVG(original_cost) AS original_cost,
        AVG(discounted_price) AS discounted_price,
        SUM(promo_spend) AS promo_spend,
        SUM(sales_units) AS sales_units,
        SUM(baseline_sales_units) AS baseline_sales_units,
        SUM(incremental_sales_units) AS incremental_sales_units,
        SUM(revenue) AS revenue,
        SUM(baseline_revenue) AS baseline_revenue,
        SUM(incremental_revenue) AS incremental_revenue,
        SUM(margin) AS margin,
        SUM(baseline_margin) AS baseline_margin,
        SUM(incremental_margin) AS incremental_margin,
        SUM(margin_wo_vf) AS margin_wo_vf,
        SUM(scan_back) AS scan_back,
        SUM(off_invoice) AS off_invoice,
        SUM(tot_vendor_fund) AS tot_vendor_fund,
        SUM(affinity_revenue) AS affinity_revenue,
        SUM(cannibalization_revenue) AS cannibalization_revenue,
        SUM(pull_forward_revenue) AS pull_forward_revenue,
        SUM(affinity_margin) AS affinity_margin,
        SUM(cannibalization_margin) AS cannibalization_margin,
        SUM(pull_forward_margin) AS pull_forward_margin,
        MAX(created_by) AS created_by,
        MAX(updated_by) AS updated_by,
        MAX(created_at) AS created_at,
        now()::timestamptz AS updated_at,
        ROUND(SUM(contribution_margin)::numeric, 2) AS contribution_margin,
        ROUND(SUM(contribution_revenue)::numeric, 2) AS contribution_revenue,
        SUM(coupon_spend) AS coupon_spend
    FROM price_promo.ps_recommended_stack_ia
    WHERE promo_id = var_promo_id
      AND recommendation_date = var_recommendation_date
    GROUP BY event_id, promo_id, currency_id, recommendation_date;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    RAISE NOTICE 'optimization_stack_agg_date: promo=%, date=%, rows=%',
        var_promo_id, var_recommendation_date, v_row_count;

    -- Insert default rows if no rows were inserted in the previous step
    IF v_row_count = 0 THEN
        INSERT INTO price_promo.ps_recommended_stack_ia_agg (
            event_id, promo_id, currency_id, recommendation_date,
            discount_level_value, offer_type_combined_display_name,
            effective_discount, original_cost, discounted_price,
            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue,
            margin, baseline_margin, incremental_margin,
            margin_wo_vf, scan_back, off_invoice, tot_vendor_fund,
            affinity_revenue, cannibalization_revenue, pull_forward_revenue,
            affinity_margin, cannibalization_margin, pull_forward_margin,
            created_by, updated_by, created_at, updated_at,
            contribution_margin, contribution_revenue, coupon_spend
        )
        SELECT
            NULL AS event_id,
            var_promo_id AS promo_id,
            currency_id,
            var_recommendation_date AS recommendation_date,
            NULL AS discount_level_value,
            NULL AS offer_type_combined_display_name,
            0 AS effective_discount,
            0 AS original_cost,
            0 AS discounted_price,
            0 AS promo_spend,
            0 AS sales_units,
            0 AS baseline_sales_units,
            0 AS incremental_sales_units,
            0 AS revenue,
            0 AS baseline_revenue,
            0 AS incremental_revenue,
            0 AS margin,
            0 AS baseline_margin,
            0 AS incremental_margin,
            0 AS margin_wo_vf,
            0 AS scan_back,
            0 AS off_invoice,
            0 AS tot_vendor_fund,
            0 AS affinity_revenue,
            0 AS cannibalization_revenue,
            0 AS pull_forward_revenue,
            0 AS affinity_margin,
            0 AS cannibalization_margin,
            0 AS pull_forward_margin,
            NULL AS created_by,
            NULL AS updated_by,
            CURRENT_TIMESTAMP AS created_at,
            CURRENT_TIMESTAMP AS updated_at,
            0 AS contribution_margin,
            0 AS contribution_revenue,
            0 AS coupon_spend
        FROM (SELECT promo_id, start_date, end_date, currency_id 
              FROM price_promo.promo_master 
              WHERE promo_id = var_promo_id) promo_info;
        
        RAISE NOTICE 'Inserted default rows for optimization_stack_agg_date: promo=%, date=%',
            var_promo_id, var_recommendation_date;
    END IF;
END;
$procedure$
;
