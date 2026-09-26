--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:backsync_forecast_finalized_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for backsync_forecast_finalized_table

DROP PROCEDURE IF EXISTS price_promo_opt.backsync_forecast_finalized_table;

CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_forecast_finalized_table(IN var_start_date date DEFAULT (CURRENT_DATE + 1), IN var_end_date date DEFAULT (CURRENT_DATE + 181))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_backsync_finalized_table;

	INSERT INTO price_promo_opt.tb_backsync_finalized_table
    SELECT event_id, promo_id, product_id, recommendation_date, discount_level_value, 
	offer_type_id, effective_discount, original_cost, discounted_price, promo_spend, 
	sales_units, baseline_sales_units, incremental_sales_units, revenue, baseline_revenue, 
	incremental_revenue, margin, baseline_margin, incremental_margin, affinity_revenue, 
	cannibalization_revenue, pull_forward_revenue, affinity_margin, cannibalization_margin, 
	pull_forward_margin, created_by, updated_by, created_at, updated_at, contribution_revenue, 
	contribution_margin, offer_type_combined_display_name, store_reco_level, currency_id, 
	vat_percentage, price_spend, customer_reco_level, gross_revenue, gross_margin, 
	gross_sales_units, coupon_spend, margin_wo_vf, scan_back, off_invoice, tot_vendor_fund, 
	ROUND(cannibalization_units, 8), ROUND(pull_forward_units, 8), ROUND(affinity_units, 8), 
	now() AS last_backsync_at
    FROM price_promo.ps_recommended_finalized f1
	WHERE f1.recommendation_date BETWEEN var_start_date AND var_end_date;

END;
$procedure$
;