--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping
CREATE TABLE monday_smart.dimension_attributes_internal (
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
    company_name varchar NOT NULL,
	CONSTRAINT dimension_attributes_internal_un UNIQUE (attribute_name, attribute_value, company_name)
);