--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_constraint_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_constraint
CREATE TABLE if not exists assort.plan_wedge_opt_constraint (
    plan_wedge_opt_cons_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    special_classification character varying NOT NULL,
    attribute_value jsonb DEFAULT '{"min_size": 1, "increment": 1, "max_value": 500, "min_value": 1}'::jsonb
);
ALTER TABLE assort.plan_wedge_opt_constraint
    ADD CONSTRAINT plan_wedge_optimization_master_pk PRIMARY KEY (plan_wedge_opt_cons_id);
ALTER TABLE assort.plan_wedge_opt_constraint
    ADD CONSTRAINT plan_wedge_opt_constraint_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
