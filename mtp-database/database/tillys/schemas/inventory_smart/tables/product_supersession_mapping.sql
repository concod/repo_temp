--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:product_supersession_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_product_supersession_mapping
--comment: initial changeset for product_supersession_mapping




CREATE TABLE inventory_smart.product_supersession_mapping (
	ps_code bigserial NOT NULL,
	old_article varchar NULL,
	old_product_code varchar NOT NULL,
	article varchar NULL,
	product_code varchar NOT NULL,
	priority int4 NULL,
	start_date date NULL,
	end_date date NULL,
	has_store_exception bool NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT product_supersession_mapping_pkey PRIMARY KEY (ps_code)
);