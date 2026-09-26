--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_mapping

CREATE TABLE base_pricing.bp_product_store_mapping (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	channel_id int4 NULL,
	eligibility text NULL,
	is_kvi bool NULL,
	price_lock bool NULL,
	price float4 NULL,
	total_cost float8 NULL,
	reference_price_1 int4 NULL,
	reference_price_2 int4 NULL,
	status bool NULL,
	CONSTRAINT bp_product_store_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id)
);