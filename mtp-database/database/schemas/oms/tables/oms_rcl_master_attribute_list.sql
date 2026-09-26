--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_rcl_master_attribute_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_rcl_master_attribute_list

CREATE TABLE IF NOT EXISTS oms.oms_rcl_master_attribute_list (
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
	attribute_dimension public."citext" NULL,
	extra jsonb NULL,
	CONSTRAINT oms_rcl_master_attribute_list_name_code_unique UNIQUE (attribute_name, module_code)
);


--changeset raja.duraisamy@impactanalytics.co:oms_rcl_master_attribute_list_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_rcl_master_attribute_list based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_rcl_master_attribute_list_module_code ON oms.oms_rcl_master_attribute_list(module_code);
