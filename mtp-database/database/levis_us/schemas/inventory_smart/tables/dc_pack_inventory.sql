-- liquibase formatted sql
-- changeset ramkumar.vahanan@impactanalytics.co:dc_pack_inventory stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
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

--changeset himansh.bhardwaj@impactanalytics.co:adding pk stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding pk
ALTER TABLE inventory_smart.dc_pack_inventory ADD CONSTRAINT dc_pack_inventory_primary_key PRIMARY KEY (product_code,pack_type_id,pack_type,dc_code);

--changeset rajesh.kumar@impactanalytics.co:dc_pack_inventory_index stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831
--comment: adding index on article, pack_type_id, pack_type
CREATE INDEX idx_dc_pack_inventory_article_pack ON inventory_smart.dc_pack_inventory (article, pack_type_id, pack_type);
