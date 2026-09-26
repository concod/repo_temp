--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_forecast_table_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_forecast_table_config_10

CREATE TABLE base_pricing.bp_forecast_table_config (
	config_id serial4 NOT NULL,
	source_table_name varchar(100) NOT NULL,
	last_approved_table_name varchar(100) NOT NULL,
	primary_key_columns _text NOT NULL,
	date_column_name varchar(50) NOT NULL,
	date_column_type varchar(20) DEFAULT 'date'::character varying NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_forecast_table_config_pkey PRIMARY KEY (config_id)
);