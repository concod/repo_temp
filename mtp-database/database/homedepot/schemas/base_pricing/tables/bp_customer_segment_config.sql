
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_customer_segment_config_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_customer_segment_config_v2

CREATE TABLE base_pricing.bp_customer_segment_config (
	config_id serial4 NOT NULL,
	is_customer_segment_enabled bool DEFAULT false NULL,
	default_segment_id int4 NULL,
	CONSTRAINT bp_customer_segment_config_pkey PRIMARY KEY (config_id),
	CONSTRAINT bp_customer_segment_config_default_segment_id_fkey FOREIGN KEY (default_segment_id) REFERENCES base_pricing.bp_customer_segment_master(segment_id)
);