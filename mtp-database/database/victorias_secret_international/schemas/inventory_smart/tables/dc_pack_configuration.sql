--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:dc_pack_config stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: dc_pack_config
CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_configuration (
	article varchar NULL,
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack int4 NULL,
	pack_description varchar NULL
);