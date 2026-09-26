--liquibase formatted sql
--changeset liquibase:plan_cluster_opt_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_master
CREATE TABLE if not exists assort.plan_cluster_opt_master (
    plan_clu_opt_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_value jsonb
);
ALTER TABLE assort.plan_cluster_opt_master
    ADD CONSTRAINT plan_cluster_opt_master_pkey PRIMARY KEY (plan_clu_opt_id);
ALTER TABLE assort.plan_cluster_opt_master
    ADD CONSTRAINT plan_cluster_opt_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;


--changeset kailash.yadav:plan_cluster_opt_master stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Index create for peformance issue.
create index if not exists plan_cluster_opt_master_plan_code_idx on assort.plan_cluster_opt_master(plan_code);