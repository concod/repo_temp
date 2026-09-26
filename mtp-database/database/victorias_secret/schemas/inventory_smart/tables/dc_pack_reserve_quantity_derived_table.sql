--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:asn_master stripComments:false splitStatements:false context:Release_1_0 labels:VPP-262
--comment: initial changeset for dc_pack_reserve_qty_derived_table

CREATE TABLE inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	"date" date NOT NULL,
	reserve_quantity numeric NULL
);

--changeset anujkumar.singh@impactanalytics.co:dc_pack_reserve_qty_derived_table_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-132
--comment: Updating Schema based on Alignment with product team

ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table ADD COLUMN IF NOT EXISTS product_code varchar NULL;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table ADD COLUMN IF NOT EXISTS size varchar NULL;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table ADD COLUMN IF NOT EXISTS dc_code int4 NULL;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table RENAME COLUMN reserve_quantity TO quantity;

--changeset shinde.samarth@impactanalytics.co:dc_pack_reserve_qty_derived_table_v4 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-132
--comment: Updating Schema to make it generic
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table RENAME COLUMN quantity TO reserve_quantity;