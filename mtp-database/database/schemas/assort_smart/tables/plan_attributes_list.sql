--liquibase formatted sql
--changeset liquibase:plan_attributes_list stripComments:false splitStatements:false context:plan_attributes_list_table labels:liquibase_project_start
--comment: initial changeset for plan_attributes_list
CREATE TABLE assort_smart.plan_attributes_list (
	attribute_name name NULL COLLATE "C",
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name NULL COLLATE "C"
);