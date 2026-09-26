--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:dc_pack_reserve_qty_derived_table stripComments:false splitStatements:false context:Release_1_0 labels:VPP-262
--comment: initial changeset for dc_pack_reserve_qty_derived_table

CREATE TABLE inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	"date" date NOT NULL,
	reserve_quantity numeric NULL
);
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table ADD CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (article, date);