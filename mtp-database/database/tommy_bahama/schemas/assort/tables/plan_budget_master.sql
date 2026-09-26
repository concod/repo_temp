--liquibase formatted sql
--changeset liquibase:plan_budget_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_budget_master
CREATE TABLE if not exists assort.plan_budget_master (
    plan_budget_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_budget_master
    ADD CONSTRAINT plan_budget_master_pkey PRIMARY KEY (plan_budget_id);
ALTER TABLE assort.plan_budget_master
    ADD CONSTRAINT plan_budget_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
