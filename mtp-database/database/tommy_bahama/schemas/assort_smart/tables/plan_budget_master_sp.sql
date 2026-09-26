--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_budget_master_sp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_budget_master_sp

CREATE TABLE IF not exists assort_smart.plan_budget_master_sp (
	plan_budget_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar(255) NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	compare_type int4 NULL,
	season_code int4 NULL,
	margin_ly float8 DEFAULT 0.0 NULL,
	margin_ty float8 DEFAULT 0.0 NULL,
	receipt_units_ly float8 DEFAULT 0.0 NULL,
	receipt_units_ty float8 DEFAULT 0.0 NULL,
	retail_receipt_ly float8 DEFAULT 0.0 NULL,
	retail_receipt_ty float8 DEFAULT 0.0 NULL,
	revenue_ly float8 DEFAULT 0.0 NULL,
	revenue_ty float8 DEFAULT 0.0 NULL,
	sales_cost_ty float8 DEFAULT 0.0 NULL,
	units_ly float8 DEFAULT 0.0 NULL,
	units_ty float8 DEFAULT 0.0 NULL,
	target float8 NULL,
	CONSTRAINT plan_budget_master_sp_pkey PRIMARY KEY (plan_budget_id)
);

--changeset abhilash.kirtikumar@impactanalytics.co:add_bop_units_column_sp stripComments:false splitStatements:false context:added_bop_units_column_to_tb_sp labels:column_addition_to_tb_sp
--comment: Added bop_units_to_sp.
ALTER TABLE assort_smart.plan_budget_master_sp
    ADD COLUMN IF NOT EXISTS bop_units_ty float8 DEFAULT 0.0 NULL;