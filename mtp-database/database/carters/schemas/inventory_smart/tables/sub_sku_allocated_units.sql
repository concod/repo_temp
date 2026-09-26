--liquibase formatted sql
--changeset liquibase:sub_sku_allocated_units stripComments:false splitStatements:false context:Release_1_0 labels:sub_sku_allocated_units
--comment: initial changeset for sub_sku_allocated_units
CREATE TABLE inventory_smart.sub_sku_allocated_units (
    dc_po_code varchar NOT NULL,
    type varchar NOT NULL,
    old_article varchar NOT NULL,
    old_pack_type_id varchar NOT NULL,
    pack_type varchar NOT NULL,
    old_allocated_qty int4 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT sub_sku_allocated_un UNIQUE (dc_po_code, type, old_article, old_pack_type_id)	
);


--changeset aman.lakkoju@impactanalytics.co:Adding_unique_constraint stripComments:false splitStatements:false labels:sub_sku_allocated_units_new_constraint
--comment: Adding unique constraint

ALTER TABLE inventory_smart.sub_sku_allocated_units
DROP CONSTRAINT sub_sku_allocated_un;

ALTER TABLE inventory_smart.sub_sku_allocated_units 
ADD CONSTRAINT sub_sku_allocated_un UNIQUE (dc_po_code, type, old_article, old_pack_type_id,created_at);