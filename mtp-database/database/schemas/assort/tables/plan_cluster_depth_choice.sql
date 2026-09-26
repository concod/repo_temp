--liquibase formatted sql
--changeset liquibase:plan_cluster_depth_choice stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_depth_choice
CREATE TABLE assort.plan_cluster_depth_choice (
    plan_cls_depth_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_cluster_depth_choice
    ADD CONSTRAINT plan_cluster_depth_choice_pkey PRIMARY KEY (plan_cls_depth_id);
ALTER TABLE assort.plan_cluster_depth_choice
    ADD CONSTRAINT plan_cluster_depth_choice_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
