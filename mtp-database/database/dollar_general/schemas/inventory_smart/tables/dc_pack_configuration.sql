--liquibase formatted sql
--changeset liquibase:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration
CREATE TABLE inventory_smart.dc_pack_configuration (
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	main_sku varchar NULL,
	comp_sku varchar NULL,
	pack_description varchar NULL,
	units_in_pack int4 NULL
);

--changeset rajat.choudhary:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:001
--comment: added alter statements to change the schema
alter TABLE inventory_smart.dc_pack_configuration rename column main_sku to article;
alter TABLE inventory_smart.dc_pack_configuration rename column comp_sku to product_code;
alter TABLE inventory_smart.dc_pack_configuration rename column pack_description to size;

