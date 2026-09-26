--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_sm_dc_pack_configuration
--comment: initial changeset for dc_pack_configuration
CREATE TABLE if NOT exists  inventory_smart.dc_pack_configuration (
	article varchar NULL,
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack int4 NULL,
	pack_description varchar NULL,
	parent_article varchar NULL
);
