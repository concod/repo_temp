--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:assort_smart.line_plan_review_target stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_plan_review_target

-- DROP TABLE assort_smart.line_plan_review_target;

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_review_target (
	plan_rt_id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	final_level varchar NOT NULL,
	channel int4 NULL,
	sub_channel int4 NOT NULL,
	gender varchar NULL,
	style_tag varchar NULL,
	receipts_pen_ty float8 DEFAULT 0.0 NULL,
	total_inv_units_ty float8 DEFAULT 0.0 NULL,
	receipt_units_ty float8 DEFAULT 0.0 NULL,
	carryover_units_ty float8 DEFAULT 0.0 NULL,
	sales_units_ty float8 DEFAULT 0.0 NULL,
	choice_count int4 NULL,
	sales_ty float8 DEFAULT 0.0 NULL,
	receipts_ty float8 DEFAULT 0.0 NULL,
	CONSTRAINT line_plan_review_target_pkey PRIMARY KEY (plan_rt_id),
	CONSTRAINT uniq_line_plan_key UNIQUE (plan_code, hierarchy_code, final_level, style_tag)
);
CREATE INDEX IF NOT EXISTS line_plan_review_target_plan_final_level_idx ON assort_smart.line_plan_review_target USING btree (plan_code, final_level);