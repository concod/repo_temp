--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:forecast_version_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_version_mapping
CREATE TABLE source_smart.forecast_version_mapping (
	version_minor varchar(255) NOT NULL,
	version_major varchar(255) NOT NULL,
	CONSTRAINT forecast_version_mapping_pkey PRIMARY KEY (version_minor)
);

--changeset genuine.basil@impactanalytics.co:forecast_version_mapping_2 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add version_number column
ALTER TABLE source_smart.forecast_version_mapping ADD COLUMN version_number int4;