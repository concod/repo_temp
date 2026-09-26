--liquibase formatted sql
--changeset liquibase:latest_inventory_raw stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory_raw
CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory_raw (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	channel varchar NOT NULL,
	"date" date NULL,
	rfid_delta int4 NULL,
	epc_units int4 NULL,
	initial_oh int4 NULL,
	wip int4 NULL,
	CONSTRAINT latest_inventory_raw_un UNIQUE (product_code, store_code, channel),
	CONSTRAINT latest_inventory_raw_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_raw_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);