--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_product_hierarchy_mapping_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_mapping_version

CREATE TABLE IF NOT EXISTS price_promo.tb_product_hierarchy_mapping_version (
	product_id int8 NULL,
	hierarchy_id int4 NULL,
	is_active int2 DEFAULT 1 NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_product_hierarchy_mapping_version_v_version_unique_key UNIQUE (version_code, product_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX tb_product_hierarchy_mapping_hierarchy_id_idx ON price_promo.tb_product_hierarchy_mapping_version USING btree (hierarchy_id);
CREATE INDEX tb_product_hierarchy_mapping_is_active_idx ON price_promo.tb_product_hierarchy_mapping_version USING btree (is_active);
CREATE INDEX tb_product_hierarchy_mapping_product_id_idx ON price_promo.tb_product_hierarchy_mapping_version USING btree (product_id);