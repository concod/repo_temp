-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:size_plan_master_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS
-- comment: initial changeset for size_plan_master

CREATE TABLE  size_smart.size_plan_master (
	plan_code serial4 NOT NULL,
	plan_name varchar NULL,
	season varchar NULL,
	"year" varchar NULL,
	"hierarchy" jsonb NULL,
	season_code int4 NULL,
	status varchar DEFAULT 'Draft'::character varying NULL,
	size_buy_generated float8 DEFAULT 0 NULL,
	season_start_date date NULL,
	season_end_date date NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NULL,
	no_of_style_color int4 DEFAULT 0 NULL,
	created_by int4 NULL,
	CONSTRAINT size_plan_master_pkey PRIMARY KEY (plan_code)
);
CREATE INDEX  idx_size_plan_master_season_code_deleted ON size_smart.size_plan_master USING btree (season_code, is_deleted) WHERE (is_deleted = false);