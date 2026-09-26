--liquibase formatted sql
--changeset liquibase:dc_pack_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_inventory
CREATE TABLE inventory_smart.dc_pack_inventory (
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	main_sku varchar NULL,
	comp_sku varchar NULL,
	dc_code varchar NULL,
	"date" date NULL,
    oh_pack_qty float4 null, 
    it_pack_qty float4 null, 
    oo_pack_qty float4 null
);

--changeset rajat.choudhary:dc_pack_inventory stripComments:false splitStatements:false context:Release_1_0 labels:002
--comment: added alter statements to change the schema for dc_pack_inventory
alter TABLE inventory_smart.dc_pack_inventory rename column main_sku to article;
alter TABLE inventory_smart.dc_pack_inventory rename column comp_sku to product_code;
alter table inventory_smart.dc_pack_inventory drop column date;
alter table inventory_smart.dc_pack_inventory add column size varchar;
alter table inventory_smart.dc_pack_inventory add column channel varchar;

