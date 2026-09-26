--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:alerts_product_store_level_version stripComments:false splitStatements:false context:Release_1_0 labels:alerts_product_store_level_version
--comment: initial changeset for alerts_product_store_level_version
-- inventory_smart.alerts_product_store_level_version definition

CREATE TABLE inventory_smart.alerts_product_store_level_version (
	version_code int4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	store_code varchar NULL,
	store_grade varchar NULL,
	product_code varchar NULL,
	first_weekly_predicted_qty float4 NULL,
	second_weekly_predicted_qty float4 NULL,
	third_weekly_predicted_qty float4 NULL,
	fourth_weekly_predicted_qty float4 NULL,
	next_4_weeks_predicted_qty float4 NULL,
	max_stock int4 NULL,
	is_resolved int4 NULL,
	forecast_over_max int4 NULL,
	article varchar NULL,
	launch_date date NULL,
	min_stock int4 NULL,
	style_name varchar NULL,
	store_name varchar NULL,
	store_type varchar NULL,
	lw_qty float4 NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	tot_inv int4 NULL,
	CONSTRAINT alerts_product_store_level_version_u_key UNIQUE (version_code, product_code, store_code),
	CONSTRAINT alerts_product_store_level_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);