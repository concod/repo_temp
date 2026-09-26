--liquibase formatted sql
--changeset liquibase:latest_inventory_delta stripComments:false splitStatements:false context:MTP-103861 labels:MTP-103861
--comment: MTP-103861:latest_inventory_delta

CREATE TABLE inventory_smart.latest_inventory_delta (
	version_code int4 DEFAULT 1 NOT NULL,
	"date" date NOT NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	store_type varchar NULL,
	display_article varchar NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT latest_inventory_delta_un UNIQUE (channel, product_code, store_code)
);

--changeset linu.nazil:latest_inventory_delta_2 stripComments:false splitStatements:false context:MTP-103861 labels:MTP-103861
--comment: Adding product and store indexes
CREATE INDEX IF NOT EXISTS latest_inventory_delta_product_code_idx ON inventory_smart.latest_inventory_delta USING btree (product_code);
CREATE INDEX IF NOT EXISTS latest_inventory_delta_store_code_idx ON inventory_smart.latest_inventory_delta USING btree (store_code);