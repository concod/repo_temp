
--liquibase formatted sql
--changeset vikash.kumar@impactanalytics.co:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration

CREATE TABLE IF NOT EXISTS  inventory_smart.dc_pack_configuration (
	article varchar NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	product_code varchar NOT NULL,
	"size" varchar NOT NULL,
	units_in_pack int4 NOT NULL,
	pack_description varchar NULL,
	pack_size varchar NULL,
	parent_article varchar NULL,
	CONSTRAINT dc_pack_configuration_unique UNIQUE (product_code, pack_type_id)
);
CREATE INDEX IF NOT EXISTS dcp_article_pack_size_idx ON inventory_smart.dc_pack_configuration USING btree (article, pack_type_id, size);