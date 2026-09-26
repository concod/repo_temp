--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:backsync_vendor_portal_usage_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for backsync_vendor_portal_usage_metrics

DROP PROCEDURE IF EXISTS price_promo_opt.backsync_vendor_portal_usage_metrics;

CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_vendor_portal_usage_metrics(IN var_start_date date DEFAULT (CURRENT_DATE - 7), IN var_end_date date DEFAULT (CURRENT_DATE - 1))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_backsync_vendor_portal_usage_metrics_summary;

    INSERT INTO price_promo_opt.tb_backsync_vendor_portal_usage_metrics_summary
    SELECT
	    um.name AS vendor_name,
	    um.email AS vendor_mail_id,
	    COUNT(DISTINCT pm.promo_id) AS total_promos,
	    COUNT(DISTINCT pm.promo_id) FILTER (
	        WHERE pm.status = 6
	    ) AS total_archived_promos,
	    SUM(pm.products_count) AS total_products,
	    COUNT(DISTINCT pm.promo_id) FILTER (
	        WHERE pm.created_at >= current_date - INTERVAL '6 days'
	          AND pm.created_at <=  current_date
	    ) AS promos_lw,
	    COUNT(DISTINCT pm.promo_id) FILTER (
	        WHERE pm.created_at >= date_trunc('month', current_date)
	          AND pm.created_at <=  date_trunc('month', current_date) + INTERVAL '1 month - 1 day'
	    ) AS promos_lm,
	    now() AS last_updated_at
	FROM price_promo.promo_master pm
	JOIN global.user_master um
	    ON pm.vendor_created_by = um.user_code
	WHERE pm.is_vendor_created_promo = TRUE
	  AND um.status = TRUE
	GROUP BY
	    pm.vendor_created_by,
	    um.name,
	    um.email;

END;
$procedure$
;