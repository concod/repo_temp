--liquibase formatted sql
--changeset liquibase:ss_filter_configuration_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ss_filter_configuration_mapping
CREATE TABLE source_smart.ss_filter_configurations_mapping (
	"label" text NOT NULL,
	column_name text NOT NULL
);