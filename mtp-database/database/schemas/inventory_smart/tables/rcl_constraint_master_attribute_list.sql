--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:rcl_constraint_master_attribute_list_modified stripComments:false splitStatements:false context:RELEASE 1.0 labels:JIRA_NO 
--comment Add comment describing your change 
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_constraint_master_attribute_list (
	attribute_name varchar NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level text NULL,
	"datatype" text NULL,
	"label" varchar NULL,
	"order_of_display" int4 NULL
);
