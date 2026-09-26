--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:assort_smart.line_review_plan_master stripComments:false splitStatements:false context:MTP-75018 labels:create_table
--comment: initial changeset for line_review_plan_master

-- DROP TABLE assort_smart.line_review_plan_master;

CREATE TABLE IF NOT EXISTS assort_smart.line_review_plan_master (
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 DEFAULT 0 NOT NULL,
	compare_year int2 DEFAULT '-1'::integer NOT NULL,
	special_classification varchar NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	hierarchy_level varchar NOT NULL,
	hierarchy_code text NOT NULL,
	record_type varchar NULL,
	channel_id int4 NULL,
	sub_channel_id int4 NULL,
	"year" varchar NULL,
	season_name varchar NULL,
	season_code varchar NULL,
	levels jsonb DEFAULT '{}'::jsonb NOT NULL,
	parent_hierarchy_combination jsonb NULL,
	quarter int4 NULL,
	status_id int4 NULL,
	steps varchar NULL,
	plan_sub_step varchar NULL,
	line_review_plan_master_id serial4 NOT NULL,
	global_choice_status bool DEFAULT false NOT NULL,
	CONSTRAINT assort_plan_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT line_review_plan_master_pkey PRIMARY KEY (line_review_plan_master_id)
);