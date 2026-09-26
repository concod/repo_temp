--liquibase formatted sql
--changeset liquibase:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration
CREATE TABLE inventory_smart.dc_pack_configuration (
	article varchar NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	product_code varchar NOT NULL,
	"size" varchar NOT NULL,
	units_in_pack int4 NOT NULL
);
ALTER TABLE inventory_smart.dc_pack_configuration ADD CONSTRAINT dc_pack_configuration_unique UNIQUE (product_code,pack_type_id);

--changeset shrinidhi.choragi@impactanalytics.co:dc_pack_configuration_pack_description stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: pack_description column addition
ALTER TABLE inventory_smart.dc_pack_configuration ADD if not exists pack_description varchar NULL;
--changeset shrinidhi.choragi@impactanalytics.co:dc_pack_configuration_pack_description_v1 stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-136 labels:schema 
--comment: downstream columns addition in dc_pack_configuration
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS pack_size  varchar NULL ;
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS color_code  varchar NULL ;
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS upc_number  varchar NULL ;
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS vendor_cd varchar NULL ;
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS dim  varchar NULL ;


--changeset aman.lakkoju:dc_pack_configuration_pack_description_v2 stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-136 labels:schema 
--comment: dc_pack_configuration changes
ALTER TABLE inventory_smart.dc_pack_configuration ADD COLUMN IF NOT EXISTS org_pack_size  varchar NULL ;