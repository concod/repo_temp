--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:tenant_configurations_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS demand_smart.tenant_configurations_master (
	config_code serial4 NOT NULL,
	module_name varchar NULL,
	parent_config varchar NULL,
	config_name varchar NULL,
	config_type varchar NULL,
	description varchar NULL,
	config_value jsonb NULL,
	application_code int4 NULL,
	user_edited bool NULL,
	module_code int4 NULL,
	screen_code int4 NULL,
	CONSTRAINT tetant_configurations_master_pkey PRIMARY KEY (config_code)
);