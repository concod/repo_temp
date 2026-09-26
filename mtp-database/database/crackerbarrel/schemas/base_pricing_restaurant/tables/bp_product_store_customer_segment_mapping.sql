--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_customer_segment_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_store_customer_segment_mapping

CREATE TABLE base_pricing_restaurant.bp_product_store_customer_segment_mapping (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	"attributes" jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_product_store_customer_segment_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id)
);