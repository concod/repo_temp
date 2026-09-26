--liquibase formatted sql
--changeset saad_adeeb:style_mapping_table stripComments:false splitStatements:false context:https://impactanalytics.atlassian.net/browse/MTP-19191 labels:VS - InventorySmart
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
