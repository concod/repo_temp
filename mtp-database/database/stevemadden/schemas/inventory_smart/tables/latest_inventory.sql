--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:sm_latest_inventory
--comment: initial changeset for latest_inventory
CREATE TABLE if NOT exists inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	channel varchar NOT NULL,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, channel),
	CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);
