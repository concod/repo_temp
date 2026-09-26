--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_budget_master_iap stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details



CREATE TABLE IF not exists assort_smart.plan_budget_master_iap (
	plan_budget_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	auc_as float8 DEFAULT 0.0 NULL,
	auc_ps float8 DEFAULT 0.0 NULL,
	auc_ly float8 DEFAULT 0.0 NULL,
	aur_as float8 DEFAULT 0.0 NULL,
	aur_ps float8 DEFAULT 0.0 NULL,
	aur_ly float8 DEFAULT 0.0 NULL,
	sales_as float8 DEFAULT 0.0 NULL,
	sales_ps float8 DEFAULT 0.0 NULL,
	sales_ly float8 DEFAULT 0.0 NULL,
	sales_units_as float8 DEFAULT 0.0 NULL,
	sales_units_ps float8 DEFAULT 0.0 NULL,
	sales_units_ly float8 DEFAULT 0.0 NULL,
	choice_count_as float8 DEFAULT 0.0 NULL,
	choice_count_ps float8 DEFAULT 0.0 NULL,
	choice_count_ly float8 DEFAULT 0.0 NULL,
	gross_margin_as float8 DEFAULT 0.0 NULL,
	gross_margin_ps float8 DEFAULT 0.0 NULL,
	gross_margin_ly float8 DEFAULT 0.0 NULL,
	receipts_price_as float8 DEFAULT 0.0 NULL,
	receipts_price_ps float8 DEFAULT 0.0 NULL,
	receipts_price_ly float8 DEFAULT 0.0 NULL,
	sales_productivity_as float8 DEFAULT 0.0 NULL,
	sales_productivity_ps float8 DEFAULT 0.0 NULL,
	sales_productivity_ly float8 DEFAULT 0.0 NULL,
	CONSTRAINT plan_budget_master_iap_pkey PRIMARY KEY (plan_budget_id),
	CONSTRAINT plan_budget_master_iap_fk FOREIGN KEY (plan_code) REFERENCES assort_smart.plan_master(plan_code) ON DELETE CASCADE
);

--changeset rishabh.kumar@impactanalytics.co liquibase:plan_budget_master_iap_add_new_columns stripComments:false splitStatements:false context:MTP-57647 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE assort_smart.plan_budget_master_iap ADD compare_type int4 NULL;
ALTER TABLE assort_smart.plan_budget_master_iap ADD season_code int4 NULL;


--changeset mayank.bhardwaj@impactanalytics.co liquibase:plan_budget_master_iap_add_and_drop_new_columns stripComments:false splitStatements:false context:MTP-64734 labels:liquibase_project_start
--comment: Add and drop new columns
ALTER TABLE assort_smart.plan_budget_master_iap
DROP CONSTRAINT plan_budget_master_iap_fk;

ALTER TABLE assort_smart.plan_budget_master_iap
DROP COLUMN auc_as,
DROP COLUMN auc_ly,
DROP COLUMN auc_ps,
DROP COLUMN aur_as,
DROP COLUMN aur_ly,
DROP COLUMN aur_ps,
DROP COLUMN choice_count_as,
DROP COLUMN choice_count_ly,
DROP COLUMN choice_count_ps,
DROP COLUMN gross_margin_as,
DROP COLUMN gross_margin_ly,
DROP COLUMN gross_margin_ps,
DROP COLUMN receipts_price_as,
DROP COLUMN receipts_price_ly,
DROP COLUMN receipts_price_ps,
DROP COLUMN sales_as,
DROP COLUMN sales_ly,
DROP COLUMN sales_productivity_as,
DROP COLUMN sales_productivity_ly,
DROP COLUMN sales_productivity_ps,
DROP COLUMN sales_ps,
DROP COLUMN sales_units_as,
DROP COLUMN sales_units_ly,
DROP COLUMN sales_units_ps;

ALTER TABLE assort_smart.plan_budget_master_iap
ADD COLUMN margin_ly float8 DEFAULT 0.0 NULL,
ADD COLUMN margin_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN receipt_units_ly float8 DEFAULT 0.0 NULL,
ADD COLUMN receipt_units_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN retail_receipt_ly float8 DEFAULT 0.0 NULL,
ADD COLUMN retail_receipt_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN revenue_ly float8 DEFAULT 0.0 NULL,
ADD COLUMN revenue_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN sales_cost_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN units_ly float8 DEFAULT 0.0 NULL,
ADD COLUMN units_ty float8 DEFAULT 0.0 NULL,
ADD COLUMN target float8 NULL;

--changeset rishabh.kumar@impactanalytics.co liquibase:remove_target_column stripComments:false splitStatements:false context:Remove_target_column labels:liquibase_project_start
--comment: Remove target column
ALTER TABLE assort_smart.plan_budget_master_iap
DROP COLUMN IF EXISTS target;

--changeset rishabh.kumar@impactanalytics.co liquibase:change_column_datetype_iap stripComments:false splitStatements:false context:change_column_datetype_iap labels:liquibase_project_start
--comment: Change column datatype
ALTER TABLE assort_smart.plan_budget_master_iap
ALTER COLUMN hierarchy_code SET DATA TYPE VARCHAR;

--changeset pramodgowda.kl@impactanalytics.co:adding_bop_columns stripComments:false splitStatements:false context:MTP-9999 labels:added bop columns
--comment: Added bop columns
ALTER TABLE assort_smart.plan_budget_master_iap
    ADD COLUMN IF NOT EXISTS bop_units_ty float8 DEFAULT 0.0 NULL;