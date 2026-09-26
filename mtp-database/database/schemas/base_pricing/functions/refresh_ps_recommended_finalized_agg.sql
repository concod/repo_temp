--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:refresh_ps_recommended_finalized_agg runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_finalized_agg

DROP FUNCTION IF EXISTS base_pricing.refresh_ps_recommended_finalized_agg(int4);

CREATE OR REPLACE FUNCTION base_pricing.refresh_ps_recommended_finalized_agg(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete existing data for the given promo_id
    DELETE FROM base_pricing.ps_recommended_finalized_agg
    WHERE promo_id = p_promo_id;

    -- Insert aggregated data for the given promo_id
    INSERT INTO base_pricing.ps_recommended_finalized_agg (
        event_id,
        promo_id,
         recommendation_date ,
        discount_level_value,
        offer_value,
        effective_discount,
        original_price,
        original_cost,
        discounted_price,
        promo_spend,
        sales_units,
        baseline_sales_units,
        incremental_sales_units,
        revenue,
        baseline_revenue,
        incremental_revenue,
        revenue_lift,
        margin,
        baseline_margin,
        incremental_margin,
        margin_lift,
        aur,
        aum,
        affinity_revenue,
        cannibalization_revenue,
        pull_forward_revenue,
        affinity_margin,
        cannibalization_margin,
        pull_forward_margin,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by,
        	offer_type_id
    )
    SELECT 
        event_id,
        promo_id,
         recommendation_date ,
        MAX(discount_level_value) AS discount_level_value,
        MAX(offer_value) AS offer_value,
        MAX(effective_discount) AS effective_discount,
        MAX(original_price) AS original_price,
        MAX(original_cost) AS original_cost,
        MAX(discounted_price) AS discounted_price,
        MAX(promo_spend) AS promo_spend,
        SUM(sales_units) AS sales_units,
        SUM(baseline_sales_units) AS baseline_sales_units,
        SUM(incremental_sales_units) AS incremental_sales_units,
        SUM(revenue) AS revenue,
        SUM(baseline_revenue) AS baseline_revenue,
        SUM(incremental_revenue) AS incremental_revenue,
        SUM(revenue_lift) AS revenue_lift,
        SUM(margin) AS margin,
        SUM(baseline_margin) AS baseline_margin,
        SUM(incremental_margin) AS incremental_margin,
        SUM(margin_lift) AS margin_lift,
        MAX(aur) AS aur,
        MAX(aum) AS aum,
        SUM(affinity_revenue) AS affinity_revenue,
        SUM(cannibalization_revenue) AS cannibalization_revenue,
        SUM(pull_forward_revenue) AS pull_forward_revenue,
        SUM(affinity_margin) AS affinity_margin,
        SUM(cannibalization_margin) AS cannibalization_margin,
        SUM(pull_forward_margin) AS pull_forward_margin,
        MAX(status) AS status,
        MAX(created_at) AS created_at,
        MAX(updated_at) AS updated_at,
        MAX(created_by) AS created_by,
        MAX(updated_by) AS updated_by,
        MAX(	offer_type_id) as 	offer_type_id
    FROM 
        base_pricing.ps_recommended_finalized
    WHERE 
        promo_id = p_promo_id
    GROUP BY 
        event_id, promo_id, recommendation_date;

END
$function$
;
