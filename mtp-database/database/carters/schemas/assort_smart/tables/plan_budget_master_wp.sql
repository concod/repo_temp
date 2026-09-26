--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:plan_budget_master_wp stripComments:false splitStatements:false context:MTP-51150 labels:liquibase_project_start
--comment: Add new table for plan budget master wp

CREATE TABLE assort_smart.plan_budget_master_wp (
	plan_budget_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	units_ty float8 NULL DEFAULT 0.0,
	margin_ty float8 NULL DEFAULT 0.0,
	retail_receipt_ty float8 NULL DEFAULT 0.0,
	receipt_units_ty float8 NULL DEFAULT 0.0,
	revenue_ty float8 NULL DEFAULT 0.0,
	units_ly float8 NULL DEFAULT 0.0,
	margin_ly float8 NULL DEFAULT 0.0,
	retail_receipt_ly float8 NULL DEFAULT 0.0,
	receipt_units_ly float8 NULL DEFAULT 0.0,
	revenue_ly float8 NULL DEFAULT 0.0,
	sales_cost_ty float8 NULL DEFAULT 0.0,
	CONSTRAINT plan_budget_master_wp_pkey PRIMARY KEY (plan_budget_id)
);

--changeset rishabh.kumar@impactanalytics.co liquibase:plan_budget_master_wp_add_new_columns stripComments:false splitStatements:false context:MTP-57647 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE assort_smart.plan_budget_master_wp ADD compare_type int4 NULL;
ALTER TABLE assort_smart.plan_budget_master_wp ADD season_code int4 NULL;


--changeset pramodgowda.kl@impactanalytics.co:adding_bop_columns stripComments:false splitStatements:false context:MTP-9999 labels:added bop columns
--comment: Added bop columns
ALTER TABLE assort_smart.plan_budget_master_wp
    ADD COLUMN IF NOT EXISTS bop_units_ty float8 DEFAULT 0.0 NULL;