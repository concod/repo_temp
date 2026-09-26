
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_customer_segment_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_customer_segment_config_10

DROP TABLE IF EXISTS base_pricing.bp_customer_segment_config CASCADE;

CREATE TABLE base_pricing.bp_customer_segment_config (
	config_id serial4 NOT NULL,
	is_customer_segment_enabled bool NULL DEFAULT false,
	default_segment_id int4 NULL,
	default_currency varchar(50) NULL,
	CONSTRAINT bp_customer_segment_config_pkey PRIMARY KEY (config_id)
);