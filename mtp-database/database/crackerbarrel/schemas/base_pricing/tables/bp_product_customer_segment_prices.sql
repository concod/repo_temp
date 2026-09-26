--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_customer_segment_prices stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_customer_segment_prices

CREATE TABLE base_pricing.bp_product_customer_segment_prices (
	product_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	price numeric(10, 2) NULL,
	base_cost numeric(10, 2) DEFAULT 0 NULL,
	rebate numeric(10, 2) DEFAULT 0 NULL,
	marketplace_fee numeric(10, 2) DEFAULT 0 NULL,
	shipping_cost numeric(10, 2) DEFAULT 0 NULL,
	rebated_cost numeric(10, 2) DEFAULT 0 NULL,
	is_approved bool DEFAULT false NULL,
	approval_date date NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	zone_structure_id int4 NULL,
	CONSTRAINT bp_product_customer_segment_prices_pkey PRIMARY KEY (product_id, segment_id)
);