--liquibase formatted sql
--changeset liquibase:plan_cluster_opt_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_attribute
CREATE TABLE assort.plan_cluster_opt_attribute (
    plan_clu_opt_id integer,
    attribute_name character varying NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_cluster_opt_attribute
    ADD CONSTRAINT plan_cluster_opt_attribute_fk FOREIGN KEY (plan_clu_opt_id) REFERENCES assort.plan_cluster_opt_master(plan_clu_opt_id) ON UPDATE SET NULL ON DELETE CASCADE;
CREATE INDEX plan_cluster_opt_attribute_plan_clu_opt_id_idx ON assort.plan_cluster_opt_attribute (plan_clu_opt_id);
