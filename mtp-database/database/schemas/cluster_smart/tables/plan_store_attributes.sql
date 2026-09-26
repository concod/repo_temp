--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:cluster_smart_plan_store_attributes stripComments:false splitStatements:false context:MTP-31708 labels:liquibase_project_start
--comment: initial changeset for cluster_smart.plan_store_attributes
CREATE TABLE cluster_smart.plan_store_attributes (
	cluster_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	is_primary bool NOT NULL,
	is_final bool NOT NULL DEFAULT false,
	levels jsonb NULL,
	CONSTRAINT plan_store_attributes_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);