--liquibase formatted sql
--changeset liquibase:cluster_plan_master stripComments:false splitStatements:false context:MTP-10389 labels:liquibase_project_start
--comment: this table is used to store the clustering results as temporary and use the load_cluster_results function to store from this table to cluster_smart.plan_cluster_bucket_map and cluster_smart.plan_cluster_bucket_map_attributes
CREATE TABLE cluster_smart.temp_cluster (
	cluster_bucket_code serial4 NOT NULL,
	cluster_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	k int4 NOT NULL,
	"label" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_optimal bool NOT NULL DEFAULT false,
	bucket_attribute_value jsonb NULL
);