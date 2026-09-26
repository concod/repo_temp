--liquibase formatted sql
--changeset liquibase:cluster_plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cluster_plan_master
CREATE TABLE cluster_smart.cluster_plan_master (
	cluster_plan_code serial4 NOT NULL,
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
	hierarchy_level varchar NULL,
	CONSTRAINT cluster_plan_egs CHECK (((selling_period_edate > selling_period_sdate))),
	CONSTRAINT cluster_plan_master_pkey PRIMARY KEY (cluster_plan_code),
	CONSTRAINT cluster_plan_master_un UNIQUE ("name",is_deleted)
);
ALTER TABLE cluster_smart.cluster_plan_master ADD CONSTRAINT cluster_plan_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE cluster_smart.cluster_plan_master ADD CONSTRAINT cluster_plan_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
