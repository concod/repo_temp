--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:dc_pack_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for dc_pack_inventory_version

CREATE TABLE if not exists inventory_smart.dc_pack_inventory_version (
	version_code int4 NOT NULL,
	product_code varchar NULL,
	article varchar NOT NULL,
	channel varchar NOT NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	oh_pack_qty int4 NULL,
	oo_pack_qty int4 NULL,
	it_pack_qty int4 NULL,
	size_id varchar NULL,
	CONSTRAINT dc_pack_inventory_version_unique_key UNIQUE (version_code, product_code, dc_code),
	CONSTRAINT dc_pack_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE,
	CONSTRAINT dc_pack_inventory_version_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset gauri.nair@impactanalytics.co:dc_pack_inventory_version_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: initial changeset for dc_pack_inventory_version_alter
ALTER TABLE inventory_smart.dc_pack_inventory_version
RENAME COLUMN size_id TO "size";

--changeset gauri.nair@impactanalytics.co:dc_pack_inventory_version_alter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1_v2
--comment: alter table changeset for dc_pack_inventory_version_alter_v2
ALTER TABLE inventory_smart.dc_pack_inventory_version
ALTER COLUMN size SET NOT NULL;
