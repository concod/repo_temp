--liquibase formatted sql
--changeset liquibase:rcl_master_attribute_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: RCL Master Attribute List table (store data related to rcl filters)

CREATE TABLE inventory_smart.rcl_master_attribute_list (
	attribute_name varchar NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level text NULL,
	"datatype" text NULL,
	"label" varchar NULL,
	order_of_display int4 NULL,
	is_mandatory bool DEFAULT false NOT NULL,
	module_code int4 NOT NULL,
	CONSTRAINT rcl_master_attribute_list_name_code_unique UNIQUE (attribute_name, module_code)
);