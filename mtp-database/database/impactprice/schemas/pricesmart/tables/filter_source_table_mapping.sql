--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:filter_source_table_mapping  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_source_table_mapping

CREATE TABLE pricesmart.filter_source_table_mapping (
	id serial4 NOT NULL,
	identifier text NOT NULL,
	table_name text NULL,
	CONSTRAINT filter_source_table_mapping_identifier_key UNIQUE (identifier),
	CONSTRAINT filter_source_table_mapping_pkey PRIMARY KEY (id)
);