--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:dc_pack_configuration_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for dc_pack_configuration_version


CREATE TABLE inventory_smart.dc_pack_configuration_version (
	version_code int4 NOT NULL,
	article varchar NULL,
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack int4 NULL,
	pack_description varchar NULL,
	pack_size varchar NULL,
	parent_article varchar NULL,
	CONSTRAINT dc_pack_configuration_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset gauri.nair@impactanalytics.co:dc_pack_configuration_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_2
--comment: alter table changeset for dc_pack_configuration_version
alter table inventory_smart.dc_pack_configuration_version add column if not exists color_code varchar;