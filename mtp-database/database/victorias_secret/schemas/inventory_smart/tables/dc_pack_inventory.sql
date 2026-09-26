--liquibase formatted sql
--changeset liquibase:dc_pack_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_inventory
CREATE TABLE inventory_smart.dc_pack_inventory (
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
