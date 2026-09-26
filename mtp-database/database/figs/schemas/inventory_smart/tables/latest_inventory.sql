--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:latest_inventory_figs stripComments:false splitStatements:false context:Release_1_0 labels:figs_latest_inventory
--comment: initial changeset for latest_inventory
CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	"date" date NOT NULL,
	CONSTRAINT latest_inventory_un UNIQUE (date, product_code, store_code),
	CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);
