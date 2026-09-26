--liquibase formatted sql
--changeset bingimalla.divyasree@impactanalytics.co:refresh_ps_recommended_scenarios_stack_agg_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_scenarios_stack_agg_stack

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

	margin_wo_vf,
    scan_back,
    off_invoice,
	tot_vendor_fund,

--	aur,
--	aum,
	affinity_revenue,
	cannibalization_revenue,
	pull_forward_revenue,
	affinity_margin,
	cannibalization_margin,
	pull_forward_margin,
--	RECOMMENDATION_TYPE_ID ,
	created_by,
	updated_by,
	created_at,
	updated_at,
	offer_type_id,
			contribution_margin,
			contribution_revenue, coupon_spend
    )

SELECT

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

	margin_wo_vf,
    scan_back,
    off_invoice,
	tot_vendor_fund,

--	aur,
--	aum,
	affinity_revenue,
	cannibalization_revenue,
	pull_forward_revenue,
	affinity_margin,
	cannibalization_margin,
	pull_forward_margin,
--	RECOMMENDATION_TYPE_ID ,
	created_by,
	updated_by,
	created_at,
	updated_at,
	offer_type_id,
			contribution_margin,
			contribution_revenue, coupon_spend
FROM
	(
	SELECT
		event_id,
		promo_id, currency_id,
		scenario_id,
		recommendation_date,
		MAX(discount_level_value) AS discount_level_value,
		coalesce(case when max(use_display_name) = 1 then MAX(OFFER_TYPE_COMBINED_DISPLAY_NAME) end,
					 concat(avg(effective_discount)::int, ' %'))::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
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


--			coalesce(sum(revenue) / nullif(sum(sales_units), 0), 0) AS aur,
--			coalesce(sum(margin) / nullif(sum(sales_units), 0), 0) AS aum,

		SUM(affinity_revenue) AS affinity_revenue,
		SUM(cannibalization_revenue) AS cannibalization_revenue,
		SUM(pull_forward_revenue) AS pull_forward_revenue,
		SUM(affinity_margin) AS affinity_margin,
		SUM(cannibalization_margin) AS cannibalization_margin,
		SUM(pull_forward_margin) AS pull_forward_margin,
--		0 AS RECOMMENDATION_TYPE_ID,
		MAX(created_by) AS created_by,
		MAX(updated_by) AS updated_by,
		MAX(created_at) AS created_at,
		now()::timestamptz AS updated_at,
		MAX(offer_type_id) AS offer_type_id,
			SUM(contribution_margin) AS contribution_margin,
			SUM(contribution_revenue) AS contribution_revenue,
		sum(coupon_spend) AS coupon_spend
	FROM
		(select * from price_promo.ps_recommended_scenarios_stack
	WHERE
		scenario_id = ANY(_scenario_id_value)) sub2
		left join
		(select promo_id, 1 as use_display_name from price_promo.ps_rules
         WHERE  product_discount_level = array[-200]
         group by 1) sub1 using(promo_id)
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
