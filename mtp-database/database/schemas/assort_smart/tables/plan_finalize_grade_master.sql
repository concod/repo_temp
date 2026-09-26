--liquibase formatted sql
--changeset liquibase:plan_finalize_grade_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_grade_master
CREATE TABLE assort_smart.plan_finalize_grade_master (
	plan_finalize_grade_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	CONSTRAINT plan_finalize_grade_master_pkey PRIMARY KEY (plan_finalize_grade_id)
);