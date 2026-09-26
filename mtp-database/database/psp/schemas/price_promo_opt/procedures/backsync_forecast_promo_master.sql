--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:backsync_forecast_promo_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for backsync_forecast_promo_master

DROP PROCEDURE IF EXISTS price_promo_opt.backsync_forecast_promo_master;

CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_forecast_promo_master(IN var_start_date date DEFAULT (CURRENT_DATE - 7), IN var_end_date date DEFAULT (CURRENT_DATE - 1))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_backsync_promo_master;

    INSERT INTO price_promo_opt.tb_backsync_promo_master
    SELECT promo_id, promo_code, event_id, name, start_date, end_date, step_count, status, status_name, is_deleted, 
	products_count, stores_count, style_id_count, product_selection_type, store_selection_type, exclusion_selection_type, 
	customer_type, offer_distribution_channel, ad_type, is_hero_promo, is_lock_promo, created_by, updated_by, 
	created_at, updated_at, marketing_channel, copied_from, future_sku_selection, last_approved_scenario_id, 
	offer_comment, upload_used, sap_promo_level, is_auto_resimulated, is_under_processing, is_overridden_scenario, 
	recommendation_type_id, copied_at, last_exmd_synced_time, is_overridden_scenario_finalized, has_stacked_offers, 
	is_simulation_disabled, last_simulation_time, last_optimized_time, total_inventory, currency_id, to_be_simulated, 
	to_be_optimised, is_vendor_created_promo, vendor_portal_status, vendor_created_by, finalized_promo_id_by_merchant, 
	parent_vendor_promo_id, review_status, review_status_updated_at, vendor_portal_status_updated_at, now() AS last_backsync_at
    FROM price_promo.promo_master pm
	JOIN price_promo.promo_status_config psc
	ON pm.status = psc.status_id;

END;
$procedure$
;