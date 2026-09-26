--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_latest_inventory
--comment: initial changeset for latest_inventory
CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory (
	product_code text NOT NULL,
	store_code text NOT NULL,
	"date" date NOT NULL,
	it int4 NULL,
	oh int4 NULL,
	oo int4 NULL,
	dc_available_qty int4 NULL,
	channel text NULL,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, "date"),
	CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX if not exists latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);
