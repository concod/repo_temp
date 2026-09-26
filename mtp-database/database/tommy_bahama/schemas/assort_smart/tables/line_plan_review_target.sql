--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.line_plan_review_target stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_plan_review_target

-- DROP TABLE assort_smart.line_plan_review_target;

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_review_target (
	plan_rt_id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	final_level varchar NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	gender varchar NULL,
	style_tag varchar NULL,
	receipts_pen_ty float8 DEFAULT 0.0 NULL,
	total_inv_units_ty float8 DEFAULT 0.0 NULL,
	receipt_units_ty float8 DEFAULT 0.0 NULL,
	carryover_units_ty float8 DEFAULT 0.0 NULL,
	sales_units_ty float8 DEFAULT 0.0 NULL,
	choice_count int4 NULL,
	CONSTRAINT line_plan_review_target_pkey PRIMARY KEY (plan_rt_id)
);
CREATE INDEX IF NOT EXISTS line_plan_review_target_plan_final_level_idx ON assort_smart.line_plan_review_target USING btree (plan_code, final_level);

--changeset hemanth.cs@impactanalytics.co:assort_smart.line_plan_review_target_unique_key stripComments:false splitStatements:false context:MTP-87204 labels:update_changeset
--comment: update changeset for line_plan_review_target to add unique constraint
ALTER TABLE assort_smart.line_plan_review_target
ADD CONSTRAINT uniq_line_plan_key UNIQUE (plan_code, hierarchy_code, final_level, style_tag);

ALTER TABLE assort_smart.line_plan_review_target ALTER COLUMN channel DROP NOT NULL;

--changeset hemanth.cs@impactanalytics.co:line_plan_review_target_columns_addition stripComments:false splitStatements:false context:MTP-100915 labels:line_plan_review_target_columns_addition
--comment: adding_new_sales_and_receipts_columns
ALTER TABLE assort_smart.line_plan_review_target
ADD COLUMN IF NOT EXISTS sales_ty float8 DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS receipts_ty float8 DEFAULT 0.0;