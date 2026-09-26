--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:refresh_ps_recommended_scenarios_agg_v12072025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_scenarios_agg_v4

DROP FUNCTION IF EXISTS price_promo.refresh_ps_recommended_scenarios_agg;

CREATE OR REPLACE FUNCTION price_promo.refresh_ps_recommended_scenarios_agg(p_promo_id integer, _scenario_id_value integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete existing data for the given promo_id and scenario_ids
    DELETE FROM price_promo.ps_recommended_scenarios_agg
    WHERE promo_id = p_promo_id
      AND scenario_id = ANY(_scenario_id_value);

    -- Insert aggregated data for the given promo_id and scenario_ids
    WITH aggregated_data AS (
       INSERT
	INTO
	price_promo.ps_recommended_scenarios_agg (
    event_id,
	promo_id, currency_id,
	scenario_id,
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

	RECOMMENDATION_TYPE_ID ,
	created_by,
	updated_by,
	created_at,
	updated_at,
	offer_type_id,
			contribution_margin,
			contribution_revenue
    )

SELECT
	event_id,
	promo_id, currency_id,
	scenario_id,
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
	RECOMMENDATION_TYPE_ID ,
	created_by,
	updated_by,
	created_at,
	updated_at,
	offer_type_id,
			contribution_margin,
			contribution_revenue
FROM
	(
	SELECT
		event_id,
		promo_id, currency_id,
		scenario_id,
		recommendation_date,
		MAX(discount_level_value) AS discount_level_value,
		MAX(sub2.OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
--		NULL::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
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
		0 AS RECOMMENDATION_TYPE_ID,
		MAX(created_by) AS created_by,
		MAX(updated_by) AS updated_by,
		MAX(created_at) AS created_at,
		now()::timestamptz AS updated_at,
		MAX(offer_type_id) AS offer_type_id,
			SUM(contribution_margin) AS contribution_margin,
			SUM(contribution_revenue) AS contribution_revenue
			

	FROM
		(select * from price_promo.ps_recommended_scenarios WHERE
		scenario_id = ANY(_scenario_id_value)) sub2
--		left join
--			(select scenario_id, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ps_scenario_discounts
--         WHERE scenario_id = ANY(_scenario_id_value)
--         group by 1) sub1 using(scenario_id)
	
	GROUP BY
		scenario_id,
		event_id,
		promo_id, currency_id,
		recommendation_date) a
--CROSS JOIN 
--		(
--	SELECT
--		DISTINCT offer_type AS offer_type_scenario
--	FROM
--		price_promo.ps_scenario_discounts
--	WHERE
--		scenario_id = ANY(_scenario_id_value)
--		) b
        RETURNING promo_id
    )
    -- Insert default rows if no rows were inserted in the previous step
    INSERT INTO price_promo.ps_recommended_scenarios_agg (
        event_id,
        promo_id, currency_id,
        scenario_id,
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
        offer_type_id
    )
    SELECT 
        NULL AS event_id,
        p_promo_id, currency_id,
        scenario_id,
        date_series AS recommendation_date,
       	discount_level_value AS discount_level_value,
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
        0 AS RECOMMENDATION_TYPE_ID,
        NULL AS created_by,
        NULL AS updated_by,
        CURRENT_TIMESTAMP AS created_at,
        CURRENT_TIMESTAMP AS updated_at,
		0 as offer_type_id
    FROM 
        (SELECT generate_series(start_date, end_date, '1 day') AS date_series,  NULL::integer as discount_level_value, NULL::varchar as OFFER_TYPE_COMBINED_DISPLAY_NAME
         ,currency_id FROM price_promo.promo_master
--         CROSS JOIN (SELECT scenario_id, max(discount_level_value) AS discount_level_value, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME
--                     FROM price_promo.ps_scenario_discounts 
--                     WHERE scenario_id = ANY(_scenario_id_value)
--                     GROUP BY scenario_id) sub

         WHERE promo_id = p_promo_id) AS date_series_subquery
cross join (select scenario_id from price_promo.scenario_master where scenario_id = ANY(_scenario_id_value)) a 
    WHERE NOT EXISTS (SELECT 1 FROM aggregated_data) ;

END;
$function$
;
