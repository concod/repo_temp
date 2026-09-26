--liquibase formatted sql
--changeset liquibase:cna_plan_cluster_bucket_map_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE if not exists cluster_smart.plan_cluster_bucket_map_attributes (
	cluster_bucket_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT plan_cluster_bucket_map_attributes_fk FOREIGN KEY (cluster_bucket_code) REFERENCES cluster_smart.plan_cluster_bucket_map(cluster_bucket_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_plan_cluster_bucket_map_attributes_cluster_bucket_code ON cluster_smart.plan_cluster_bucket_map_attributes USING btree (cluster_bucket_code);

--changeset chaitanyaprasad.reddy@impactanalytics.co:cna_plan_cluster_bucket_map_attributes_idx stripComments:false splitStatements:false context:cna labels:cluster_smart_cna_indexes
--comment: CNA-specific indexes (after bootstrap changeset).
CREATE INDEX idx_pcbma_attr_bucket_val ON cluster_smart.plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name) INCLUDE (attribute_value);