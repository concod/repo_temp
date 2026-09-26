--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_backsync_vendor_portal_usage_metrics_summary stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_backsync_vendor_portal_usage_metrics_summary

DROP TABLE IF EXISTS price_promo_opt.tb_backsync_vendor_portal_usage_metrics_summary;

CREATE TABLE price_promo_opt.tb_backsync_vendor_portal_usage_metrics_summary (
	vendor_name varchar(255) NULL,
	vendor_mail_id varchar(255) NULL,
	total_promos int8 NULL,
	total_archived_promo int8 NULL,
	total_products int8 NULL,
	promos_lw int8 NULL,
	promos_lm int8 NULL,
	last_updated_at timestamptz NULL
);