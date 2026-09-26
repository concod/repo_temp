
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_new_l3_master_sp stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details



CREATE TABLE IF not exists assort_smart.plan_new_l3_master_sp (
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
	style_code _varchar NULL
);