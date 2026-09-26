--liquibase formatted sql
--changeset liquibase:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration

CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_configuration (
	article varchar NULL,
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack int4 NULL,
	parent_article varchar NULL,
	pack_description varchar NULL,
	CONSTRAINT dc_pack_configuration_unique UNIQUE (product_code, pack_type_id)
);

-- changeset krishna@impactanalytics.co:pack_desc stripComments:false splitStatements:false context:MTP-120997 labels:MTP-120997
-- comment: adding index
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join ON inventory_smart.dc_pack_configuration USING btree (pack_type_id, article, pack_type, product_code);


-- changeset krishna@impactanalytics.co:pack-arti-size index stripComments:false splitStatements:false context:MTP-120997 labels:MTP-120997
-- comment: index on pack_type_id, article, size
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join_on_size ON inventory_smart.dc_pack_configuration USING btree (pack_type_id, article, size);