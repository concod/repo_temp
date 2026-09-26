
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_customer_segment_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_customer_segment_mapping_v2

CREATE TABLE base_pricing.bp_product_store_customer_segment_mapping (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	"attributes" jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_product_store_customer_segment_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id),
	CONSTRAINT bp_product_store_customer_segment_mapping_product_id_fkey FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id),
	CONSTRAINT bp_product_store_customer_segment_mapping_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES base_pricing.bp_customer_segment_master(segment_id),
	CONSTRAINT bp_product_store_customer_segment_mapping_store_id_fkey FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id)
);