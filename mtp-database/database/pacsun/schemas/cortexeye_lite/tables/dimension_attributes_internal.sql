--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attributes_internal

CREATE TABLE cortexeye_lite.dimension_attributes_internal (
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
);