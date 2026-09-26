--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:QUERY_SYNC labels:QUERY_SYNC 
--comment query sync for latest_inventory
CREATE TABLE inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	channel varchar NOT NULL,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, channel)
);


-- inventory_smart.latest_inventory foreign keys

ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;