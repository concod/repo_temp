--liquibase formatted sql
--changeset liquibase:plan_cluster_final stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_final
CREATE TABLE assort.plan_cluster_final (
    cluster_code_id serial4 NOT NULL,
    cluster_name varchar NOT NULL,
    plan_code integer NOT NULL
);
ALTER TABLE assort.plan_cluster_final
    ADD CONSTRAINT plan_cluster_final_pk PRIMARY KEY (cluster_code_id);
ALTER TABLE assort.plan_cluster_final
    ADD CONSTRAINT plan_cluster_final_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
