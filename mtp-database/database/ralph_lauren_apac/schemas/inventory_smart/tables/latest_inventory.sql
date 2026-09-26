--liquibase formatted sql
--changeset liquibase:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory
CREATE TABLE inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	channel varchar NOT NULL,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, channel)
);
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);

--changeset vivek.subramanya:latest_inventory_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added book_inv and rfid_inv columns to latest_inventory
ALTER TABLE inventory_smart.latest_inventory ADD rfid_inv int4 NULL;
ALTER TABLE inventory_smart.latest_inventory ADD book_inv int4 NULL;

--changeset sidhartha.c@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added forecasting_channel and retail_region columns to latest_inventory
ALTER TABLE inventory_smart.latest_inventory 
ADD forecasting_channel varchar NULL,
ADD retail_region varchar NULL;