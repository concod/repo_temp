--liquibase formatted sql
--changeset liquibase:latest_inventory_delta stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: initial changeset for latest_inventory_delta
CREATE TABLE inventory_smart.latest_inventory_delta (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	channel varchar NULL,
	CONSTRAINT latest_inventory_delta_un UNIQUE (product_code, store_code)
);
CREATE INDEX latest_inventory_delta_product_code_idx ON inventory_smart.latest_inventory_delta USING btree (product_code);

--changeset adeshkumar:latest_inventory_delta stripComments:false splitStatements:false context:MTP-25853 labels:MTP-25853
--comment: MTP-25853-add-current-timestamp
ALTER TABLE inventory_smart.latest_inventory_delta ADD COLUMN updated_at timestamptz;