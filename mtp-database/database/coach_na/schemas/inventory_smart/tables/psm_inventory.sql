-- liquibase formatted sql
-- changeset draksharapu.rajesh@impactanalytics.co:psm_inventory_coach_na stripComments:false splitStatements:false context: AA labels:schema 
-- comment: initial changeset for psm_inventory

CREATE TABLE   inventory_smart.psm_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
    article varchar NOT NULL,
	total_inv int4 NULL,

	CONSTRAINT psm_inventory_un UNIQUE ( product_code, store_code),
	CONSTRAINT psm_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT psm_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

