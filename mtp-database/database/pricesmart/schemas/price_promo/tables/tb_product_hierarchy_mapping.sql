--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_mapping

CREATE TABLE price_promo.tb_product_hierarchy_mapping (
	product_id int8 NULL,
	l5_cuq text NULL,
	l5_id text NULL,
	l5_name text NULL,
	hierarchy_id int4 NULL,
	is_active int2 DEFAULT 1 NULL
);
CREATE INDEX tb_product_hierarchy_mapping_hierarchy_id_idx ON price_promo.tb_product_hierarchy_mapping USING btree (hierarchy_id);
CREATE INDEX tb_product_hierarchy_mapping_is_active_idx ON price_promo.tb_product_hierarchy_mapping USING btree (is_active);
CREATE INDEX tb_product_hierarchy_mapping_product_id_idx ON price_promo.tb_product_hierarchy_mapping USING btree (product_id);