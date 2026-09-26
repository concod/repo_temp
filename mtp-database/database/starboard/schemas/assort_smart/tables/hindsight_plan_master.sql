
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.hindsight_plan_attributes_list stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for hindsight_plan_attributes_list 


CREATE TABLE IF not exists assort_smart.hindsight_plan_master (
	hindsight_plan_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 DEFAULT 0 NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	steps numeric(2, 1) DEFAULT 1.1 NOT NULL,
	channel _varchar DEFAULT '{}'::character varying[] NOT NULL,
	hierarchy_level varchar NOT NULL,
	plan_sub_step varchar DEFAULT 'plan'::character varying NULL,
	special_classification varchar NULL,
	CONSTRAINT hindsight_plan_master_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT hindsight_plan_master_pkey PRIMARY KEY (hindsight_plan_code),
	CONSTRAINT hindsight_plan_master_un UNIQUE (name, is_deleted)
);