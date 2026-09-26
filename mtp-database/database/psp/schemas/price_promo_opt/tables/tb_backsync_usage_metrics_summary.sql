--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_backsync_usage_metrics_summary stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_backsync_usage_metrics_summary

DROP TABLE IF EXISTS price_promo_opt.tb_backsync_usage_metrics_summary;

CREATE TABLE price_promo_opt.tb_backsync_usage_metrics_summary (
	active_users int4 NULL,
	unique_users int4 NULL,
	promos_lm int4 NULL,
	promos_lw int4 NULL,
	sim_inc_rev int4 NULL,
	sim_inc_margin int4 NULL,
	act_inc_rev int4 NULL,
	act_inc_margin int4 NULL,
	total_promos int4 NULL,
	last_updated_at timestamptz NULL
);