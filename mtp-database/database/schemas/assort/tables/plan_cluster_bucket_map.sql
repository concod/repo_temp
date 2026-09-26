--liquibase formatted sql
--changeset liquibase:plan_cluster_bucket_map stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_bucket_map
CREATE TABLE assort.plan_cluster_bucket_map (
    cluster_bucket_code serial4 NOT NULL,
    plan_code integer NOT NULL,
    cluster_name varchar NOT NULL,
    bucket_id varchar NOT NULL,
    special_classification varchar NOT NULL,
    is_optimal boolean DEFAULT false NOT NULL,
    is_final boolean DEFAULT false NOT NULL
);
COMMENT ON COLUMN assort.plan_cluster_bucket_map.is_final IS 'Final bucket ';
ALTER TABLE assort.plan_cluster_bucket_map
    ADD CONSTRAINT plan_cluster_bucket_map_pkey PRIMARY KEY (cluster_bucket_code);
ALTER TABLE assort.plan_cluster_bucket_map
    ADD CONSTRAINT plan_cluster_bucket_map_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
