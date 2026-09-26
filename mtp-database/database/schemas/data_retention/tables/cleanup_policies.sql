--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:cleanup_policies stripComments:false splitStatements:false context:cleanup_policies labels:liquibase_project_start
--comment: initial changeset for cleanup_policies

CREATE TABLE data_retention.cleanup_policies (
	id serial4 NOT NULL,
	sl_no int4 NOT NULL,
	schema_name text NOT NULL,
	table_name text NOT NULL,
	cleanup_strategy text NOT NULL,
	cleanup_frequency text NOT NULL,
	cleanup_condition text NOT NULL,
	last_cleanup_time timestamp NULL,
	CONSTRAINT cleanup_policies_pkey PRIMARY KEY (id)
);