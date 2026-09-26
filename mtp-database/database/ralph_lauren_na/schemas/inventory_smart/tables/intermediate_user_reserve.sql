--liquibase formatted sql
--changeset kuldeep.rathore:intermediate_user_reserve stripComments:false splitStatements:false context:MTP-48261 labels:Ralph Lauren-InventorySmart
--comment: initial changeset for intermediate_user_reserve table
CREATE TABLE inventory_smart.intermediate_user_reserve (
	article varchar NULL,
	size varchar NULL,
    prepack varchar NULL,
	stockcat varchar NULL,
    store_code varchar NULL,
    user_reserve_quantity int4 NULL,
    updated_at timestamp NULL, 
    updated_by text NULL, 
    child_id text NULL, 
    file_id text NULL
    
);