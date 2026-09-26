--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_l3_aps_iap stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details



CREATE TABLE IF not exists assort_smart.plan_l3_aps_iap (
	plan_l3_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	flow_id int4 NOT NULL,
	moq float8 DEFAULT 0.0 NULL,
	st_ly float8 DEFAULT 0.0 NULL,
	st_ty float8 DEFAULT 0.0 NULL,
	aps_ly float8 DEFAULT 0.0 NULL,
	aps_ty float8 DEFAULT 0.0 NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	min_cc float8 DEFAULT 0.0 NULL,
	cc_ly float8 DEFAULT 0.0 NULL,
	qty_ly float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	sales_unit_ly float8 DEFAULT 0.0 NULL,
	sales_unit_ty float8 DEFAULT 0.0 NULL,
	constraint_aps_ty float8 DEFAULT 0.0 NULL,
	all_door_cc float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ly float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ty float8 DEFAULT 0.0 NULL,
	forecast_units_ly float8 DEFAULT 0.0 NULL,
	forecast_units_ty float8 DEFAULT 0.0 NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	min_cc_threshold float8 DEFAULT 0.0 NULL,
	all_door_cc_enabled float8 DEFAULT 0.0 NULL,
	CONSTRAINT plan_l3_aps_iap_pkey PRIMARY KEY (plan_l3_aps_id),
	CONSTRAINT plan_l4_aps_iap_fk FOREIGN KEY (plan_code) REFERENCES assort_smart.plan_master(plan_code) ON DELETE CASCADE
);