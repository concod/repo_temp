--liquibase formatted sql
--changeset swapnil.bhange:dc_pack_configuration_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration_version

-- inventory_smart.dc_pack_configuration_version definition
-- Drop table
-- DROP TABLE inventory_smart.dc_pack_configuration_version;

CREATE TABLE inventory_smart.dc_pack_configuration_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	product_code varchar NOT NULL,
	"size" varchar NOT NULL,
	units_in_pack int4 NOT NULL,
	pack_description varchar NULL,
	pack_size varchar NULL,
	color_code varchar NULL,
	upc_number varchar NULL,
	vendor_cd varchar NULL,
	dim varchar NULL,
	parent_article varchar NULL,
    CONSTRAINT dc_pack_configuration_version_unique_1 UNIQUE (version_code, product_code, pack_type_id, pack_description)
)
PARTITION BY LIST (version_code);

-- inventory_smart.dc_pack_configuration_version foreign keys
-- inventory_smart.dc_pack_inventory_version foreign keys

ALTER TABLE inventory_smart.dc_pack_configuration_version ADD CONSTRAINT dc_pack_configuration_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:dc_pack_configuration_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding display_article column for dc_pack_configuration_version_v2

ALTER TABLE inventory_smart.dc_pack_configuration_version ADD COLUMN IF NOT EXISTS display_article varchar NULL;

