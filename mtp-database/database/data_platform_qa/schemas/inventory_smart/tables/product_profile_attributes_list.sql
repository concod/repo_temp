--liquibase formatted sql
--changeset liquibase:product_profile_attributes_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_attributes_list
CREATE TABLE inventory_smart.product_profile_attributes_list (
	attribute_name varchar NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level text NULL,
	"datatype" text NULL
);
