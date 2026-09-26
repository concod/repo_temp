--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.depth_cc_nle_dump_table_wp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: table_create

CREATE TABLE assort_smart.depth_cc_nle_dump_table_wp (
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	depth_ly float8 DEFAULT 0.0 NULL,
	depth_ty float8 DEFAULT 0.0 NULL,
	choice_ly float8 DEFAULT 0.0 NULL,
	choice_ty float8 DEFAULT 0.0 NULL,
	store_cnt float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	total_choice_count_ly float8 DEFAULT 0.0 NULL,
	total_choice_count_ty float8 DEFAULT 0.0 NULL,
	compare_type int2 NULL,
	total_depth_ly float8 NULL,
	total_depth_ty float8 NULL,
	min_cc float8 DEFAULT 0.0 NULL,
	depth_cc_nle_dump_id serial4 NOT NULL,
	CONSTRAINT depth_cc_nle_dump_table_wp_pkey PRIMARY KEY (depth_cc_nle_dump_id)
);
CREATE INDEX depth_cc_nle_dump_table__wp_plan_code_idx ON assort_smart.depth_cc_nle_dump_table_wp USING btree (plan_code);