-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:dc_pack_inventory stripComments:false splitStatements:false context:MTP labels:MTP
-- comment: initial changeset for dc_pack_inventory



-- inventory_smart.dc_pack_inventory definition

-- Drop table

-- DROP TABLE inventory_smart.dc_pack_inventory;

CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_inventory (
    product_code VARCHAR(50) NOT NULL,
    pack_type_id VARCHAR(50) NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    article VARCHAR(50) NOT NULL,
    dc_code INT NOT NULL,
    oh_pack_qty FLOAT4 NULL,
    it_pack_qty FLOAT4 NULL,
    oo_pack_qty FLOAT4 NULL,
    "size" VARCHAR(50) NULL,
    channel VARCHAR(50) NULL,
    CONSTRAINT dc_pack_inventory_primary_key 
        PRIMARY KEY (product_code, pack_type_id, pack_type, dc_code)
);