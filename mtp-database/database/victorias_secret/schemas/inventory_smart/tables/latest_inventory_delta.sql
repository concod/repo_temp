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

--changeset liquibase:add_columns_to_latest_inventory_delta stripComments:false splitStatements:false context:MTP-57622 labels:MTP-57622
--comment: add updated_at and wip columns to latest_inventory_delta
ALTER TABLE inventory_smart.latest_inventory_delta
ADD COLUMN updated_at timestamp NULL,
ADD COLUMN wip int4 NULL;

--changeset kamuju.mahaveer:add_columns_to_latest_inventory_delta_v1 stripComments:false splitStatements:false context:MTP-57622 labels:MTP-57622
--comment: add updated_at and wip columns to latest_inventory_delta
ALTER TABLE inventory_smart.latest_inventory_delta
ADD COLUMN IF NOT EXISTS created_date  timestamp NULL;

