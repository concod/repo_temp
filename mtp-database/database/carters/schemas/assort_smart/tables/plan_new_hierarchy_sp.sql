--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_new_hierarchy_sp stripComments:false splitStatements:false context:MTP-64869 labels:update_tables
--comment: table_update

CREATE TABLE if not exists assort_smart.plan_new_hierarchy_sp (
	plan_code int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	aur_ly float8 DEFAULT 0.0 NULL,
	aur_ty float8 DEFAULT 0.0 NULL,
	budget_ly float8 DEFAULT 0.0 NULL,
	budget_ty float8 DEFAULT 0.0 NULL,
	revenue_ly float8 DEFAULT 0.0 NULL,
	revenue_ty float8 DEFAULT 0.0 NULL,
	txn_aur_ly float8 DEFAULT 0.0 NULL,
	txn_aur_ty float8 DEFAULT 0.0 NULL,
	budget_diff float8 DEFAULT 0.0 NULL,
	l2_budget_ty float8 DEFAULT 0.0 NULL,
	sell_through float8 DEFAULT 0.0 NULL,
	penetration_ly float8 DEFAULT 0.0 NULL,
	penetration_ty float8 DEFAULT 0.0 NULL,
	penetration_diff float8 DEFAULT 0.0 NULL,
	receipts_quantity_ly float8 DEFAULT 0.0 NULL,
	receipts_quantity_ty float8 DEFAULT 0.0 NULL,
	total_available_cost_ly float8 DEFAULT 0.0 NULL,
	total_available_quantity_ly float8 DEFAULT 0.0 NULL,
	style_code _varchar NULL,
	channel_code varchar NULL,
	season_code int4 NULL,
	hierarchy_code text NULL
);