--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_customer_segment_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_customer_segment_config

CREATE TABLE base_pricing.bp_customer_segment_config (
	config_id serial4 NOT NULL,
	is_customer_segment_enabled bool DEFAULT false NULL,
	default_segment_id int4 NULL,
	default_currency varchar(10) NULL,
	CONSTRAINT bp_customer_segment_config_pkey PRIMARY KEY (config_id)
);