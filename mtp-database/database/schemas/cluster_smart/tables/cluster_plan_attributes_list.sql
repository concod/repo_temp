--liquibase formatted sql
--changeset liquibase:cluster_plan_attributes_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.cluster_plan_attributes_list (
	attribute_name name NULL COLLATE "C",
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name NULL COLLATE "C"
);