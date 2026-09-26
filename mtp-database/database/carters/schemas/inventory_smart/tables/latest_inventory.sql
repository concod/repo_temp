--liquibase formatted sql
--changeset liquibase:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory
CREATE TABLE inventory_smart.latest_inventory (
	"date" date NOT NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	rfid_delta int4 NULL,
	rfid_store_oh int4 NULL,
	intial_oh int4 NULL,
	store_reserve int4 NULL,
	child_sku varchar NULL,
	CONSTRAINT latest_inventory_un UNIQUE (date, channel, product_code, store_code)
);
CREATE INDEX latest_inventory_date_idx ON inventory_smart.latest_inventory USING btree (date);
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);
CREATE INDEX latest_inventory_store_code_idx ON inventory_smart.latest_inventory USING btree (store_code);
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;

-- changeset shrinidhi.choragi:latest_inventory stripComments:false splitStatements:false context:db_sync labels:delete columns 
-- comment: deleting columns that are not needed
ALTER TABLE inventory_smart.latest_inventory DROP COLUMN rfid_delta;
ALTER TABLE inventory_smart.latest_inventory DROP COLUMN rfid_store_oh;
ALTER TABLE inventory_smart.latest_inventory DROP COLUMN intial_oh;
ALTER TABLE inventory_smart.latest_inventory DROP COLUMN store_reserve;
ALTER TABLE inventory_smart.latest_inventory DROP COLUMN child_sku;