--liquibase formatted sql
--changeset liquibase:hindsight_plan_attributes_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for hindsight_plan_master
CREATE TABLE assort_smart.hindsight_plan_attributes_list (
	attribute_name name NULL COLLATE "C",
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name NULL COLLATE "C"
);