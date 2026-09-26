--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:refresh_ps_recommended_ia_projected_agg_v23325 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_ia_projected_agg_v3

DROP FUNCTION IF EXISTS price_promo.refresh_ps_recommended_ia_projected_agg;

CREATE OR REPLACE FUNCTION price_promo.refresh_ps_recommended_ia_projected_agg(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete existing data for the given promo_id
    DELETE FROM price_promo.ps_recommended_ia_projected_agg
    WHERE promo_id = p_promo_id;

    -- Insert aggregated data for the given promo_id
    WITH aggregated_data AS (
        INSERT INTO price_promo.ps_recommended_ia_projected_agg (
            event_id,
            promo_id,currency_id,
            recommendation_date,
            discount_level_value,
            OFFER_TYPE_COMBINED_DISPLAY_NAME,
            effective_discount,

            original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,

            revenue,
            baseline_revenue,
            incremental_revenue,

            margin,
            baseline_margin,
            incremental_margin,

            aur,
            aum,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            RECOMMENDATION_TYPE_ID,
            created_by,
            updated_by,
            created_at,
            updated_at,
			contribution_margin,
			contribution_revenue
        )
        SELECT
            event_id, promo_id, currency_id,
            recommendation_date,
            MAX(discount_level_value) AS discount_level_value,
            --MAX(sub1.OFFER_TYPE_COMBINED_DISPLAY_NAME)
			NULL::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
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

			coalesce(sum(revenue) / nullif(sum(sales_units), 0), 0) AS aur,
			coalesce(sum(margin) / nullif(sum(sales_units), 0), 0) AS aum,
            SUM(affinity_revenue) AS affinity_revenue,
            SUM(cannibalization_revenue) AS cannibalization_revenue,
            SUM(pull_forward_revenue) AS pull_forward_revenue,
            SUM(affinity_margin) AS affinity_margin,
            SUM(cannibalization_margin) AS cannibalization_margin,
            SUM(pull_forward_margin) AS pull_forward_margin,
            1 as  RECOMMENDATION_TYPE_ID,
            MAX(created_by) AS created_by,
            MAX(updated_by) AS updated_by,
            MAX(created_at) AS created_at,
            MAX(updated_at) AS updated_at,
			round(SUM(contribution_margin)::numeric,2) as contribution_margin,
			round(sum(contribution_revenue)::numeric,2) as contribution_revenue
        FROM
            (select * from price_promo.ps_recommended_ia_projected WHERE
            promo_id = p_promo_id) sub2
--		left join
--			(select promo_id, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ia_ps_scenario_discounts
--         WHERE promo_id = p_promo_id
--         group by 1) sub1 using(promo_id)

        GROUP BY
            event_id, promo_id, currency_id, recommendation_date
        RETURNING promo_id
    )
    -- Insert default rows if no rows were inserted in the previous step
    INSERT INTO price_promo.ps_recommended_ia_projected_agg (
        event_id,
        promo_id, currency_id,
        recommendation_date,
        discount_level_value,
        OFFER_TYPE_COMBINED_DISPLAY_NAME,
        effective_discount,

        original_cost,
        discounted_price,
        promo_spend,
        sales_units,
        baseline_sales_units,
        incremental_sales_units,
        revenue,
        baseline_revenue,
        incremental_revenue,

        margin,
        baseline_margin,
        incremental_margin,

        aur,
        aum,
        affinity_revenue,
        cannibalization_revenue,
        pull_forward_revenue,
        affinity_margin,
        cannibalization_margin,
        pull_forward_margin,
        RECOMMENDATION_TYPE_ID,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        NULL AS event_id,
        p_promo_id, 1 as currency_id,
        date_series AS recommendation_date,
        discount_level_value,
        date_series_subquery.OFFER_TYPE_COMBINED_DISPLAY_NAME,
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

        0 AS aur,
        0 AS aum,
        0 AS affinity_revenue,
        0 AS cannibalization_revenue,
        0 AS pull_forward_revenue,
        0 AS affinity_margin,
        0 AS cannibalization_margin,
        0 AS pull_forward_margin,
        1 AS RECOMMENDATION_TYPE_ID,
        NULL AS created_by,
        NULL AS updated_by,
        CURRENT_TIMESTAMP AS created_at,
        CURRENT_TIMESTAMP AS updated_at
    FROM
        (SELECT generate_series(start_date, end_date, '1 day') AS date_series, NULL::varchar as OFFER_TYPE_COMBINED_DISPLAY_NAME, NULL::integer as discount_level_value
         FROM (select promo_id, start_date, end_date from price_promo.promo_master where promo_id = p_promo_id) a2
--		LEFT join (select promo_id,  max(discount_level_value) discount_level_value, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ia_ps_scenario_discounts
--         WHERE promo_id = p_promo_id
--         group by 1) sub1 using(promo_id)
			) AS date_series_subquery
    WHERE NOT EXISTS (SELECT 1 FROM aggregated_data);

END
$function$
;
