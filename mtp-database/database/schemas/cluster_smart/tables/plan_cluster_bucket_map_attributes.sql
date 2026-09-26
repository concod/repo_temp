--liquibase formatted sql
--changeset liquibase:plan_cluster_bucket_map_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.plan_cluster_bucket_map_attributes (
	cluster_bucket_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT plan_cluster_bucket_map_attributes_fk FOREIGN KEY (cluster_bucket_code) REFERENCES cluster_smart.plan_cluster_bucket_map(cluster_bucket_code) ON DELETE CASCADE
);
CREATE INDEX plan_cluster_bucket_map_attributes_cluster_bucket_code_idx ON cluster_smart.plan_cluster_bucket_map_attributes USING btree (cluster_bucket_code);