--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_group_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_store_group_store_mapping

CREATE TABLE base_pricing_restaurant.bp_store_group_store_mapping (
	store_group_id int4 NOT NULL,
	store_id int4 NOT NULL,
	CONSTRAINT uq_bp_store_group_store_mapping UNIQUE (store_group_id, store_id),
	CONSTRAINT fk_bp_store_group_store_mapping_sg_id FOREIGN KEY (store_group_id) REFERENCES base_pricing_restaurant.bp_store_group(store_group_id)
)
PARTITION BY LIST (store_group_id);