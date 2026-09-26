--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:backsync_forecast_reporting_post_promo_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for backsync_forecast_reporting_post_promo_date

DROP PROCEDURE IF EXISTS price_promo_opt.backsync_forecast_reporting_post_promo_date;

CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_forecast_reporting_post_promo_date(IN var_start_date date DEFAULT (CURRENT_DATE - 7), IN var_end_date date DEFAULT (CURRENT_DATE - 1))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_backsync_reporting_post_promo_date;

	INSERT INTO price_promo_opt.tb_backsync_reporting_post_promo_date
	SELECT promo_id, product_id, s0_id, s0_name, s1_id, s1_name, date, fw, fy, week_start_date, actual_sales_units, 
	finalized_sales_units, baseline_sales_units, actual_revenue, finalized_revenue, baseline_revenue, actual_margin, 
	finalized_margin, baseline_margin, lw_sales_units, lw_revenue, lw_margin, ly_sales_units, ly_revenue, ly_margin, 
	actual_discount, actual_inventory, actual_contribution_revenue, finalized_contribution_revenue, actual_contribution_margin, 
	finalized_contribution_margin, lw_contribution_revenue, lw_contribution_margin, ly_contribution_revenue, 
	ly_contribution_margin, fs_sales_units, fs_revenue, fs_margin, fso_sales_units, fso_revenue, fso_margin, event_id, 
	actual_coupon_spend, lw_coupon_spend, ly_coupon_spend, actual_item_plan_unit, actual_item_plan_revenue, actual_item_plan_margin, 
	ly_item_plan_unit, ly_item_plan_revenue, ly_item_plan_margin, lw_item_plan_unit, lw_item_plan_revenue, lw_item_plan_margin, 
	ROUND(finalized_spend, 8) as finalized_spend, ROUND(actual_spend, 8) as actual_spend, 
	ROUND(finalized_promo_spend, 8) as finalized_promo_spend, ROUND(actual_promo_spend, 8) as actual_promo_spend, 
	ROUND(finalized_coupon_spend, 8) as finalized_coupon_spend, now() AS last_backsync_at
    FROM price_promo.ps_reporting_post_promo_date r3
    WHERE r3.date BETWEEN var_start_date AND var_end_date;

END;
$procedure$
;