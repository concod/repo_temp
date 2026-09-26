--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:product_supersession_mapping_intl stripComments:false splitStatements:false context:VS_inv_smart labels:supersession_mapping
--comment: initial changeset for product_supersession_mapping intl

CREATE TABLE IF NOT EXISTS inventory_smart.product_supersession_mapping (
	ps_code bigserial NOT NULL,
	old_article varchar NULL,
	old_product_code varchar NULL,
	article varchar NULL,
	product_code varchar NULL,
	priority int4 NULL,
	start_date date NULL,
	end_date date NULL,
	has_store_exception bool NULL,
	updated_by varchar(50) NULL,
	updated_at timestamp NULL,
	created_by varchar(50) NULL,
	created_at timestamp NULL,
	supersession_id varchar NULL,
	CONSTRAINT product_supersession_mapping_pkey PRIMARY KEY (ps_code)
);