--liquibase formatted sql
--changeset liquibase:plan_cluster_bucket_map stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.plan_cluster_bucket_map (
	cluster_bucket_code serial4 NOT NULL,
	cluster_plan_code int4 NOT NULL,
	cluster_name varchar NOT NULL,
	bucket_id varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_optimal bool NOT NULL DEFAULT false,
	is_final bool NOT NULL DEFAULT false,
	CONSTRAINT plan_cluster_bucket_map_pkey PRIMARY KEY (cluster_bucket_code),
	CONSTRAINT plan_cluster_bucket_map_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);

--changeset hemant.kumar@impactanalytics.co:cluster_smart.plan_cluster_bucket_map liquibase:plan_cluster_depth_choice stripComments:false splitStatements:false context:added_new_column_bucket_attribute_value labels:liquibase_project_start
--comment: initial changeset for plan_cluster_bucket_map
ALTER TABLE cluster_smart.plan_cluster_bucket_map ADD COLUMN IF NOT EXISTS bucket_attribute_value jsonb NULL;