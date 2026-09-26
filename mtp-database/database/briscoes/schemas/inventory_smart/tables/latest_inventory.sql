--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_latest_inventory
--comment: initial changeset for latest_inventory
CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	"date" date NOT NULL,
	sales_org_name varchar NOT NULL,
	CONSTRAINT latest_inventory_un UNIQUE (date, product_code, store_code, sales_org_name),
	CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);
