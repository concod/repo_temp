--liquibase formatted sql
--changeset liquibase:vendor_product_location stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_product_location
CREATE TABLE "global".vendor_product_location (
	vendor_code varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	lead_time jsonb NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	lead_time_variation jsonb NULL,
	CONSTRAINT vendor_product_location_pk PRIMARY KEY (vendor_code, product_code, store_code),
	CONSTRAINT fk_prodcuct_code FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT fk_store_code FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT fk_vendor_code FOREIGN KEY (vendor_code) REFERENCES "global".vendor_master(vendor_code) ON DELETE CASCADE
);