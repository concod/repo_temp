-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:dc_pack_configuration_2 stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
-- comment: initial changeset for dc_pack_configuration

CREATE TABLE inventory_smart.dc_pack_configuration (
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack float8 NULL,
	pack_description int4 NULL,
	article varchar NULL
);


-- changeset aiyush.prasad@impactanalytics.co:dc_pack_configuration_3 stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
-- comment: adding style_id

	ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN style_id varchar NULL;
