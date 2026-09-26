--liquibase formatted sql
--changeset liquibase:cna_plan_cluster_bucket_map stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE if not exists cluster_smart.plan_cluster_bucket_map (
	cluster_bucket_code serial4 NOT NULL,
	cluster_plan_code int4 NOT NULL,
	cluster_name varchar NOT NULL,
	bucket_id varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_optimal bool NOT NULL DEFAULT false,
	is_final bool NOT NULL DEFAULT false,
	bucket_attribute_value jsonb NULL,
	CONSTRAINT plan_cluster_bucket_map_pkey PRIMARY KEY (cluster_bucket_code),
	CONSTRAINT plan_cluster_bucket_map_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);

--changeset chaitanyaprasad.reddy@impactanalytics.co:cna_plan_cluster_bucket_map_idx stripComments:false splitStatements:false context:cna labels:cluster_smart_cna_indexes
--comment: CNA-specific indexes (after bootstrap changeset).
CREATE INDEX idx_pcbm_plan_special_bucket ON cluster_smart.plan_cluster_bucket_map (cluster_plan_code, special_classification, bucket_id) INCLUDE (cluster_bucket_code, cluster_name, bucket_attribute_value);