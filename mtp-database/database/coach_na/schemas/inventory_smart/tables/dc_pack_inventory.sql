-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:dc_pack_inventory stripComments:false splitStatements:false context:MTP-80320 labels:MTP-80320 
-- comment: initial changeset for dc_pack_inventory

CREATE TABLE inventory_smart.dc_pack_inventory (
	product_code varchar(50) NULL,
	pack_type_id varchar(50) NULL,
	pack_type varchar(50) NULL,
	article varchar(50) NULL,
	dc_code int4 NULL,
	oh_pack_qty float4 NULL,
	it_pack_qty float4 NULL,
	oo_pack_qty float4 NULL,
	"size" varchar NULL,
	channel varchar(50) NULL
);