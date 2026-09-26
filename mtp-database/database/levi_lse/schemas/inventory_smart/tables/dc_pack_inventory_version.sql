--liquibase formatted sql
--changeset himansh.bhardwaj@impactanalytics.co:dc_pack_inventory_version stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
--comment: initial changeset for dc_pack_inventory_version

CREATE TABLE inventory_smart.dc_pack_inventory_version (
    version_code int4 NOT NULL,
    product_code varchar(50) NULL,
    pack_type_id varchar(50) NULL,
    pack_type varchar(50) NULL,
    article varchar(50) NULL,
    dc_code int4 NULL,
    oh_pack_qty float4 NULL,
    it_pack_qty float4 NULL,
    oo_pack_qty float4 NULL,
    "size" varchar NULL,
    channel varchar(50) NULL,
    CONSTRAINT dc_pack_inventory_version_pk PRIMARY KEY (version_code, product_code, pack_type_id, pack_type, dc_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.dc_pack_inventory_version foreign keys

ALTER TABLE inventory_smart.dc_pack_inventory_version ADD CONSTRAINT dc_pack_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

--changeset himansh.bhardwaj@impactanalytics.co:adding_units_in_pack stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
--comment: adding_units_in_pack
ALTER TABLE inventory_smart.dc_pack_inventory_version ADD COLUMN IF NOT EXISTS units_in_pack int4 NULL;