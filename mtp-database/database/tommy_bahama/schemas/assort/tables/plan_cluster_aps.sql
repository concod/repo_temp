--liquibase formatted sql
--changeset liquibase:plan_cluster_aps_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_aps
CREATE TABLE if not exists assort.plan_cluster_aps (
    plan_clu_aps_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    is_final boolean DEFAULT false NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_cluster_aps
    ADD CONSTRAINT plan_cluster_aps_pkey PRIMARY KEY (plan_clu_aps_id);
ALTER TABLE assort.plan_cluster_aps
    ADD CONSTRAINT plan_cluster_aps_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
