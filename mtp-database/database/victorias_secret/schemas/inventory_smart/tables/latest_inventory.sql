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

--changeset kamuju.mahaveer@impactanalytics.co:latest_inventory_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-310
--comment: Added 5 new Columns as per VS Requirement
ALTER TABLE inventory_smart.latest_inventory  ADD "date" date NULL;
ALTER TABLE inventory_smart.latest_inventory  ADD rfid_delta int4 NULL;
ALTER TABLE inventory_smart.latest_inventory  ADD rfid_store_oh int4 NULL;
ALTER TABLE inventory_smart.latest_inventory  ADD initial_oh int4 NULL;
ALTER TABLE inventory_smart.latest_inventory  ADD store_reserve int4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:latest_inventory_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Added new columns and modified existing as per requirement 
ALTER TABLE inventory_smart.latest_inventory  ADD wip int4 NULL;
ALTER TABLE inventory_smart.latest_inventory RENAME COLUMN rfid_store_oh TO epc_units;

