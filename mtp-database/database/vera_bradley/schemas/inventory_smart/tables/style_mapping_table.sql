--liquibase formatted sql
--changeset laraib.ahmad:style_mapping_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping_table
CREATE TABLE inventory_smart.style_mapping_table (
	new_article varchar(50) NULL,
	new_product_code varchar(50) NULL,
	old_article varchar(50) NULL,
	old_product_code varchar(50) NULL,
	mapping_type varchar(50) NULL,
	priority int4 NULL,
	effective_date date NULL,
	updated_at timestamp NULL,
	updated_by varchar(50) NULL
);

--changeset bikrant.gupta:style_mapping_table stripComments:false splitStatements:false context:MTP-32382-fix4 labels:MTP-32382-fix4
--comment: Added old_l columns
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_l0_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_l1_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_l2_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_l3_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_cvsc varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_product_description varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_size varchar NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD COLUMN IF NOT EXISTS old_size_name varchar NULL;
--changeset bikrant.gupta:style_mapping_table_hierarchy_add stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-40185
--comment: Style color Id column size changes
ALTER TABLE inventory_smart.style_mapping_table ALTER COLUMN old_cvsc TYPE VARCHAR;
