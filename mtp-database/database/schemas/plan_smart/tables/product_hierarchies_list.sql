--liquibase formatted sql
--changeset liquibase:product_hierarchies_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchies_list
CREATE TABLE plan_smart.product_hierarchies_list (
	attribute_name name NULL COLLATE "C",
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	is_null_allowed bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name NULL COLLATE "C",
	source_display_name text NULL COLLATE "C"
);