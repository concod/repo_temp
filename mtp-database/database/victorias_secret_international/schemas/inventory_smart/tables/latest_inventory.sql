--liquibase formatted sql
--changeset liquibase:latest_inventory_vs_intl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory

DROP TABLE IF EXISTS inventory_smart.latest_inventory;

CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory (
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
	store_reserve int4 NULL,
	wip int4 NULL,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, channel),
	CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);

--changeset pradeep.kumar:adding_dc_oh_oo stripComments:false splitStatements:false context:Release_1_0 labels:adding_dc_oh_oo_column
--comment: adding dc_oh_oo column

ALTER TABLE inventory_smart.latest_inventory ADD COLUMN IF NOT EXISTS dc_oh_oo INT4 NULL;