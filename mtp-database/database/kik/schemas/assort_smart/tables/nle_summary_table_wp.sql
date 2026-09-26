--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.nle_summary_table_wp_pipiline_fix stripComments:false splitStatements:false context:NLE labels:initial_changeset
--comment: initial changeset for nle_summary_table_wp

CREATE TABLE IF NOT EXISTS assort_smart.nle_summary_table_wp (
	id serial4 NOT NULL,
	hierarchy_code text NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	depth_ty float8 DEFAULT 0.0 NOT NULL,
	new_depth_ty float8 DEFAULT 0.0 NOT NULL,
	choice_ty float8 DEFAULT 0.0 NOT NULL,
	new_choice_ty float8 DEFAULT 0.0 NOT NULL,
	receipts_delta float8 DEFAULT 0.0 NOT NULL,
	carryover_flag text NULL,
	depth_delta float8 DEFAULT 0.0 NOT NULL,
	choice_delta float8 DEFAULT 0.0 NOT NULL,
	nle_flag varchar NULL,
	compare_type int4 NULL,
	plan_code int4 NULL,
	min_cc float8 DEFAULT 0.0 NULL,
	season_code int4 NULL,
	CONSTRAINT nle_summary_table_wp_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_plan_code ON assort_smart.nle_summary_table_wp USING btree (plan_code);