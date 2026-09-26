--liquibase formatted sql
--changeset liquibase:tb_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_hierarchy_mapping
CREATE TABLE price_promo.tb_store_hierarchy_mapping (
	store_id int4 NULL,
	store_code int4 NULL,
	is_active int2 NULL,
	hierarchy_id int4 NULL
);
CREATE INDEX tb_store_hierarchy_mapping_hierarchy_id_idx ON price_promo.tb_store_hierarchy_mapping USING btree (hierarchy_id);
CREATE INDEX tb_store_hierarchy_mapping_store_id_idx ON price_promo.tb_store_hierarchy_mapping USING btree (store_id);