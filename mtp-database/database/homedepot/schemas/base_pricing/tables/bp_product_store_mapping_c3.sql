--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:bp_product_store_mapping_c3_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for bp_product_store_mapping_c3_v2


DROP TABLE IF EXISTS base_pricing.bp_product_store_mapping_c3;
CREATE TABLE base_pricing.bp_product_store_mapping_c3 (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	price_lock bool NULL,
	price float8 NULL,
	segment_id int4 NOT NULL,
	eligibility text NULL,
    is_kvi bool NULL,
	CONSTRAINT bp_product_store_mapping_c3_pkey PRIMARY KEY (product_id, store_id, segment_id),
	CONSTRAINT fk_product_c3 FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id),
	CONSTRAINT fk_segment_c3 FOREIGN KEY (segment_id) REFERENCES base_pricing.bp_customer_segment_master(segment_id),
	CONSTRAINT fk_store_c3 FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id)
);