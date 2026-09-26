--liquibase formatted sql
--changeset liquibase:product_heirarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_heirarchy
CREATE TABLE source_smart.product_heirarchy (
	division_name varchar(50) NULL,
	attribute_name varchar(50) NULL,
	is_mandatory bool NULL,
	attribute_value varchar(50) NULL
);