--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:cleanup_policies_1 stripComments:false splitStatements:false context:cleanup_policies labels:liquibase_project_start
--comment: initial changeset for cleanup_policies

CREATE TABLE IF NOT EXISTS inventory_smart.available_hierarchy_codes (
	id serial4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	serial_value int4 NULL,
	reserved_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	used bool DEFAULT false NULL,
	CONSTRAINT available_hierarchy_codes_hierarchy_code_key UNIQUE (hierarchy_code),
	CONSTRAINT available_hierarchy_codes_pkey PRIMARY KEY (id)
);