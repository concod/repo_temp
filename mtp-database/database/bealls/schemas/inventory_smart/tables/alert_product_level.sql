--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:alert_product_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial  changeset for alert_product_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level (
    l0_name varchar NULL,
	l1_name varchar NULL,
	article varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	season varchar NULL,
	l5_id varchar NULL,
	l5_name varchar NULL,
	collection varchar NULL,
	product_type varchar NULL,
	launch_date date NULL,
	color_name varchar NULL,
	color varchar NULL,
	clearance_flag bool NULL,
	overstock_flag int4 NULL,
	understock_flag int4 NULL,
	stockout_flag int4 NULL,
	cfc_age_gt_5_alert int4 NULL,
	cfc_age_gt_10_alert int4 NULL,
	cfc_age_gt_20_alert int4 NULL,
	overstock_total_wos float8 NULL,
	overstock_style_life_cycle float8 NULL,
	overstock_net_dc_available_incoming float8 NULL,
	understock_total_wos float8 NULL,
	understock_style_life_cycle float8 NULL,
	understock_net_dc_available_incoming float8 NULL,
	stockout_instock_per float8 NULL,
	stockout_ata float8 NULL,
	stockout_str_oh float8 NULL,
	cfc_gt_5_stores int4 NULL,
	cfc_gt_10_stores int4 NULL,
	cfc_gt_20_stores int4 NULL
);

