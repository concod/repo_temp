--liquibase formatted sql
--changeset liquibase:plan_new_l3_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_new_l3_master
CREATE TABLE assort.plan_new_l3_master (
    plan_code integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    levels jsonb,
    attributes jsonb,
    style_code character varying[]
);
ALTER TABLE assort.plan_new_l3_master
    ADD CONSTRAINT plan_new_l4_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;

