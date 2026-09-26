--liquibase formatted sql
--changeset saad_adeeb:style_mapping_table stripComments:false splitStatements:false context:https://impactanalytics.atlassian.net/browse/MTP-19191 labels:Ralph Lauren - InventorySmart
--comment: initial changeset for style_mapping_table
CREATE TABLE inventory_smart.style_mapping_table (
	new_article varchar(50) NULL,
	new_cvsc varchar(50) NULL,
	old_cvsc varchar(50) NULL,
	new_product_code varchar(50) NULL,
	old_article varchar(50) NULL,
	old_product_code varchar(50) NULL,
	mapping_type varchar(50) NULL,
	priority int4 NULL,
	effective_date date NULL,
	updated_at timestamp NULL,
	updated_by varchar(50) NULL
);
--changeset saad_adeeb:style_mapping_table_hierarchy_add stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-27214
--comment: Added old hierarchy information
ALTER TABLE inventory_smart.style_mapping_table ADD old_product_description varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_l0_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD ol_l1_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_l2_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_l3_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_l4_name varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_size varchar(50) NULL;
ALTER TABLE inventory_smart.style_mapping_table ADD old_size_name varchar(50) NULL;
--changeset bikrant.gupta:style_mapping_table_hierarchy_add stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-40185
--comment: Style color Id column size changes
ALTER TABLE inventory_smart.style_mapping_table ALTER COLUMN old_cvsc TYPE VARCHAR;
--changeset divvela.rohit:style_mapping_table stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-41566
--comment: added model_description column
ALTER TABLE inventory_smart.style_mapping_table ADD model_description varchar(50) NULL;
--changeset kailash:style_mapping_table stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-41566
--comment: added model_description column
ALTER TABLE inventory_smart.style_mapping_table RENAME COLUMN model_description TO old_model_description;
--changeset saad.adeeb:style_mapping_table_upload stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-46877
--comment: added model_description column
ALTER TABLE inventory_smart.style_mapping_table  ADD upload_flag varchar NOT NULL DEFAULT false;
--changeset kuldeep.rathore@impactanalytics.co stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-38297
--comment: added old_brand column MTP-38297
ALTER TABLE inventory_smart.style_mapping_table ADD old_brand varchar(50) NULL;
