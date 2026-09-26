--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_mapping_10

CREATE TABLE base_pricing.bp_product_store_mapping (
	product_id int8 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	channel_id int4 NULL,
	base_cost float8 NULL,
	additional_cost float8 NULL,
	total_cost float8 NULL,
	price float8 NULL,
	price_lock bool NULL,
	status bool DEFAULT true NULL,
	eligibility text NULL,
	is_kvi bool NULL,
	reference_price_1 float8 NULL,
	reference_price_2 float8 NULL,
	CONSTRAINT bp_product_store_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id),
	CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id)
);