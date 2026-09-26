--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_product_store_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_store_mapping_1

DROP TABLE IF EXISTS base_pricing_restaurant.bp_product_store_mapping CASCADE;

CREATE TABLE base_pricing_restaurant.bp_product_store_mapping (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	channel_id int4 NULL,
	eligibility text NULL,
	status bool NULL,
	is_kvi bool NULL,
	price_lock bool NULL,
	price float4 NULL,
	base_cost float4 NULL,
	additional_cost float4 NULL,
	total_cost float8 NULL,
	reference_price_1 float8 NULL,
	reference_price_2 float8 NULL,
	CONSTRAINT bp_product_store_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id)
);
