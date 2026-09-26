--liquibase formatted sql
--changeset liquibase:plan_finalize_assort_master stripComments:false splitStatements:false context:MTP-2990 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_assort_master
CREATE TABLE assort.plan_finalize_assort_master (
	plan_finalize_assort_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_finalize_assort_master_pkey PRIMARY KEY (plan_finalize_assort_id),
	CONSTRAINT plan_finalize_assort_master_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE
);