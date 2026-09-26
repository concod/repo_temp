--liquibase formatted sql
--changeset liquibase:dimension_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attributes
CREATE TABLE monday_smart.dimension_attributes (
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT dimension_attributes_un UNIQUE (attribute_name, attribute_value)
);
--changeset bhargav.polavarapu@impactanalytics.co:dropping_dimension_mapping_table stripComments:false splitStatements:false context:Release_2 labels:dropping_dimension_mapping_table
--comment: dropping the table dimension_mapping
DROP table if  exists monday_smart.dimension_attributes ;