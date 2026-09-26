--liquibase formatted sql
--changeset liquibase:plan_l3_aps stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_aps
CREATE TABLE assort.plan_l3_aps (
    plan_l3_aps_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_l3_aps
    ADD CONSTRAINT plan_l4_aps_pkey PRIMARY KEY (plan_l3_aps_id);
ALTER TABLE assort.plan_l3_aps
    ADD CONSTRAINT plan_l4_aps_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
