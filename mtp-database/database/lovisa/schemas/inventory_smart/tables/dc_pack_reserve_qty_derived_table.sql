--liquibase formatted sql
--changeset sreenivas.s@impactanalytics.co:dc_pack_reserve_qty_derived_table stripComments:false splitStatements:false context:Release_1_0 labels:VPP-262
--comment: initial changeset for dc_pack_reserve_qty_derived_table

CREATE TABLE inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	size varchar NULL,
	dc_code int4 null,
	"date" date NOT NULL,
	quantity numeric NULL,
    CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (article, date)
);


--changeset aleena.reji@impactanalytics.co:dc_pack_reserve_qty_derived_table_v2 stripComments:false splitStatements:false context:Release_1_0 labels:VPP-262
--comment: initial changeset for dc_pack_reserve_qty_derived_table_v2

alter table inventory_smart.dc_pack_reserve_quantity_derived_table rename column quantity to reserve_quantity;