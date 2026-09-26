--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:dc_pack_inv stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: dc_pack_inv
CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_inventory (
	product_code varchar NOT NULL,
	article varchar NOT NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	oh_pack_qty int4 NULL,
	oo_pack_qty int4 NULL,
	it_pack_qty int4 NULL,
	channel varchar NOT NULL,
	"size" varchar NOT NULL,
	CONSTRAINT dc_pack_inventory_un UNIQUE (product_code, dc_code, pack_type_id, channel)
);