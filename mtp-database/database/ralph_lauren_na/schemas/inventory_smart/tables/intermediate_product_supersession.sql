--liquibase formatted sql
--changeset kuldeep.rathore:intermediate_product_supersession stripComments:false splitStatements:false context:MTP-48264 labels:Ralph Lauren-InventorySmart
--comment: initial changeset for intermediate_product_supersession table
CREATE TABLE inventory_smart.intermediate_product_supersession (
	new_article varchar NULL,
	new_size varchar NULL,
    old_article varchar NULL,
	old_size varchar NULL,
    priority varchar NULL,
    mapping_start_date date NULL,
    delete bool NULL, 
    updated_at timestamptz NULL, 
    updated_by text NULL, 
    child_id text NULL, 
    file_id text NULL
);