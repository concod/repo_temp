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

--changeset linu.nazil@impactanalytics.co:rcl_master_attribute_list_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding attribute_dimension column
ALTER TABLE inventory_smart.rcl_master_attribute_list ADD COLUMN IF NOT EXISTS attribute_dimension citext null;

--changeset linu.nazil@impactanalytics.co:rcl_master_attribute_list_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding attribute_dimension column
ALTER TABLE inventory_smart.rcl_master_attribute_list ADD COLUMN IF NOT EXISTS extra jsonb null;

--changeset akash.bhandari@impactanalytics.co:rcl_master_attribute_list_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Extend uniqueness to include attribute_dimension to support multi-dimension attributes (product/store) and prevent cross-dimension conflicts during joins and hierarchy resolution

ALTER TABLE inventory_smart.rcl_master_attribute_list DROP CONSTRAINT rcl_master_attribute_list_name_code_unique;
ALTER TABLE inventory_smart.rcl_master_attribute_list ADD CONSTRAINT rcl_master_attribute_list_name_code_dimension_unique UNIQUE (attribute_name, module_code, attribute_dimension);
