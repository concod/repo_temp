--liquibase formatted sql
--changeset liquibase:hindsight_plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for hindsight_plan_master

CREATE TABLE assort_smart.hindsight_plan_master (
	hindsight_plan_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 NOT NULL DEFAULT 0,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	steps numeric(2, 1) NOT NULL DEFAULT 1.1,
	channel _varchar NOT NULL DEFAULT '{}'::character varying[],
	hierarchy_level varchar NOT NULL,
	plan_sub_step varchar NULL DEFAULT 'plan'::character varying,
	CONSTRAINT hindsight_plan_master_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT hindsight_plan_master_pkey PRIMARY KEY (hindsight_plan_code),
	CONSTRAINT hindsight_plan_master_un UNIQUE (name, is_deleted)
);


--changeset hemant.kumar@impactanalytics.co:assort_smart.hindsight_plan_master liquibase:assort_master_plan stripComments:false splitStatements:false context:special_classification labels:liquibase_project_start
--comment: initial changeset for hindsight_plan_master
ALTER TABLE assort_smart.hindsight_plan_master ADD special_classification varchar NULL;
