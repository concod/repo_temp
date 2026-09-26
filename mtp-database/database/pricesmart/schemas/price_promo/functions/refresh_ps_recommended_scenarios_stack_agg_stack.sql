--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:refresh_ps_recommended_scenarios_stack_agg_stack_27121 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_scenarios_agg

DROP FUNCTION IF EXISTS price_promo.refresh_ps_recommended_scenarios_stack_agg_stack;

CREATE OR REPLACE FUNCTION price_promo.refresh_ps_recommended_scenarios_stack_agg_stack(_scenario_id_value integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete existing data for the given promo_id and scenario_ids
    DELETE FROM price_promo.ps_recommended_scenarios_stack_agg
    WHERE scenario_id = ANY(_scenario_id_value);


       INSERT
	INTO
	price_promo.ps_recommended_scenarios_stack_agg (

	promo_id, currency_id,
	scenario_id,
	recommendation_date,
	discount_level_value,
	OFFER_TYPE_COMBINED_DISPLAY_NAME ,
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

	promo_id, currency_id,
	scenario_id,
	recommendation_date,
	discount_level_value,
--	CASE
--		WHEN offer_type_scenario = 'tiered_offer' THEN concat(effective_discount::int, ' %')
--		ELSE OFFER_TYPE_COMBINED_DISPLAY_NAME
--	END
	NULL::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME ,
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
--		MAX(sub1.OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
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
		(select * from price_promo.ps_recommended_scenarios_stack
	WHERE
		scenario_id = ANY(_scenario_id_value)) sub2
--		left join
--				(select scenario_id, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ps_scenario_discounts
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
       ;

END
$function$
;