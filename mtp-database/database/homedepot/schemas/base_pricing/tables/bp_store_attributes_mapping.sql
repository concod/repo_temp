
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_attributes_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_attributes_mapping_v2

CREATE TABLE base_pricing.bp_store_attributes_mapping (
	store_id int4 NOT NULL,
	"attributes" jsonb NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_store_attributes_mapping_pkey PRIMARY KEY (store_id)
);