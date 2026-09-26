--liquibase formatted sql
--changeset liquibase:plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_master
CREATE TABLE assort_smart.plan_master (
	plan_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 NOT NULL DEFAULT 0,
	compare_year int2 NOT NULL DEFAULT '-1'::integer,
	special_classification varchar NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	steps numeric(2, 1) NOT NULL DEFAULT 1.1,
	channel _varchar NOT NULL DEFAULT '{}'::character varying[],
	hierarchy_level varchar NOT NULL,
	CONSTRAINT assort_plan_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT assort_plan_master_pkey PRIMARY KEY (plan_code),
	CONSTRAINT plan_master_un UNIQUE (name, is_deleted)
);

--changeset pradiksha.k@impactanalytics.co:plan_master stripComments:false splitStatements:false context:MTP-23511 labels:liquibase_project_start
--comment: added a new column plan_sub_step

ALTER TABLE assort_smart.plan_master
ADD plan_sub_step varchar NULL
DEFAULT 'review_target';
