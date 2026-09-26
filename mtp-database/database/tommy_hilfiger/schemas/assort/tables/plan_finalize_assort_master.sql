--liquibase formatted sql
--changeset linu.nazil:plan_finalize_assort_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort.plan_finalize_assort_master
CREATE TABLE IF NOT EXISTS assort.plan_finalize_assort_master (
	plan_finalize_assort_id int4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_finalize_assort_master_pkey PRIMARY KEY (plan_finalize_assort_id),
	CONSTRAINT plan_finalize_assort_master_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE
);

--changeset linu.nazil:plan_finalize_assort_master_seq_assort stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new changeset for assort.plan_finalize_assort_master
CREATE SEQUENCE assort.plan_finalize_assort_master_plan_finalize_assort_id_seq;
ALTER TABLE assort.plan_finalize_assort_master ALTER COLUMN plan_finalize_assort_id SET DEFAULT nextval('assort.plan_finalize_assort_master_plan_finalize_assort_id_seq'); 
