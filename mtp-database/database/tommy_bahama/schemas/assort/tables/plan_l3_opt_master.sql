--liquibase formatted sql
--changeset liquibase:plan_l3_opt_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master
CREATE TABLE if not exists assort.plan_l3_opt_master (
    plan_bud_opt_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    is_active varchar DEFAULT 'YES'::character varying,
    attribute_value jsonb
);
ALTER TABLE assort.plan_l3_opt_master
    ADD CONSTRAINT plan_l4_opt_master_master_pkey PRIMARY KEY (plan_bud_opt_id);
ALTER TABLE assort.plan_l3_opt_master
    ADD CONSTRAINT plan_l4_opt_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
--changeset hemant.kumar@impactanalytics.co:assort.plan_l3_opt_master liquibase:plan_cluster_aps stripComments:false splitStatements:false context:plan_code_add_in_index labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master
CREATE index if not exists plan_l3_opt_master_plan_code_idx ON assort.plan_l3_opt_master (plan_code);
