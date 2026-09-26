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

--changeset dushant.raut:dc_pack_inventory_cons_dropped stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35001
--comment: added stock_cat column 

ALTER TABLE inventory_smart.dc_pack_inventory DROP CONSTRAINT dc_pack_inventory_un;
ALTER TABLE inventory_smart.dc_pack_inventory ADD stock_cat varchar NULL;
ALTER TABLE inventory_smart.dc_pack_inventory ADD CONSTRAINT dc_pack_inventory_un UNIQUE (product_code,dc_code,pack_type_id,channel,stock_cat);

--changeset saad.adeeb:dc_pack_inventory_pack_type_id_og stripComments:false splitStatements:false context:Release_1_0 labels:MTP-29953,MTP-35876
--comment: added 4 columns 
ALTER TABLE inventory_smart.dc_pack_inventory ADD sap_ean varchar NULL;
ALTER TABLE inventory_smart.dc_pack_inventory ADD sap_upc varchar NULL;
ALTER TABLE inventory_smart.dc_pack_inventory ADD sold_to_party varchar NULL;
ALTER TABLE inventory_smart.dc_pack_inventory ADD pack_type_id_og varchar NULL;
