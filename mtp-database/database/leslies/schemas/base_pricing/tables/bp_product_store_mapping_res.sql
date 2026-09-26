--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_mapping_res_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_mapping_res_10


DROP TABLE IF EXISTS base_pricing.bp_product_store_mapping_res;
CREATE TABLE base_pricing.bp_product_store_mapping_res (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	price_lock bool NULL,
	price float8 NULL,
	segment_id int4 NOT NULL,
	eligibility text NULL,
	is_kvi bool NULL,
	reference_price_1 float8 NULL,
	reference_price_2 float8 NULL,
	created_at date NULL,
	updated_at date NULL,
	CONSTRAINT bp_product_store_mapping_res_pkey PRIMARY KEY (product_id, store_id, segment_id),
	CONSTRAINT fk_product_res FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id),
	CONSTRAINT fk_segment_res FOREIGN KEY (segment_id) REFERENCES base_pricing.bp_customer_segment_master(segment_id),
	CONSTRAINT fk_store_res FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id)
);