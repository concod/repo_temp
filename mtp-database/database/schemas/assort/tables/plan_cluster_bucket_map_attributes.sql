--liquibase formatted sql
--changeset liquibase:plan_cluster_bucket_map_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_bucket_map_attributes
CREATE TABLE assort.plan_cluster_bucket_map_attributes (
    cluster_bucket_code integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL
);
ALTER TABLE assort.plan_cluster_bucket_map_attributes
    ADD CONSTRAINT plan_cluster_bucket_map_attributes_fk FOREIGN KEY (cluster_bucket_code) REFERENCES assort.plan_cluster_bucket_map(cluster_bucket_code) ON DELETE CASCADE;
