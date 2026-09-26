--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_drop stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_drop
CREATE TABLE assort.plan_wedge_opt_drop (
    plan_wedge_opt_drop_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    drop_split boolean,
    choice_flow boolean,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_wedge_opt_drop
    ADD CONSTRAINT plan_wedge_opt_drop_pkey PRIMARY KEY (plan_wedge_opt_drop_id);
ALTER TABLE assort.plan_wedge_opt_drop
    ADD CONSTRAINT plan_wedge_opt_drop_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
