--liquibase formatted sql
--changeset swapnil.bhange:dc_pack_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_inventory_version

-- inventory_smart.dc_pack_inventory_version definition
-- Drop table
-- DROP TABLE inventory_smart.dc_pack_inventory_version;

CREATE TABLE inventory_smart.dc_pack_inventory_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	oh_pack_qty int4 NULL,
	oo_pack_qty int4 NULL,
	it_pack_qty int4 NULL,
	channel varchar NOT NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	CONSTRAINT dc_pack_inventory_version_unique_key UNIQUE (version_code, product_code, dc_code)
)
PARTITION BY LIST (version_code);


-- inventory_smart.dc_pack_inventory_version foreign keys

ALTER TABLE inventory_smart.dc_pack_inventory_version ADD CONSTRAINT dc_pack_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_pack_inventory_version ADD CONSTRAINT dc_pack_inventory_version_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:dc_pack_inventory_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding display_article dc_pack_inventory_version_v2
ALTER TABLE inventory_smart.dc_pack_inventory_version ADD COLUMN IF NOT EXISTS display_article varchar NULL;

--changeset linu.nazil:dc_pack_inventory_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index on article column for dc_pack_inventory_version
CREATE INDEX dc_pack_inventory_article_idx ON inventory_smart.dc_pack_inventory_version  (article);



