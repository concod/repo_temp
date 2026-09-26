--liquibase formatted sql
--changeset liquibase:plan_finalize_grade_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_grade_master
CREATE TABLE if not exists assort.plan_finalize_grade_master (
    plan_finalize_grade_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL
);
ALTER TABLE assort.plan_finalize_grade_master
    ADD CONSTRAINT plan_finalize_grade_master_pkey PRIMARY KEY (plan_finalize_grade_id);
ALTER TABLE assort.plan_finalize_grade_master
    ADD CONSTRAINT plan_finalize_grade_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
