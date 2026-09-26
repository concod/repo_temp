--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:store_reserve stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for store_reserve

CREATE TABLE inventory_smart.store_reserve (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	choice varchar NULL,
	initial_oh int4 NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	store_reserve int4 NULL,
	rfid_delta int4 NULL,
	rfid_store_oh int4 NULL,
	net_available int4 NULL,
	reservation_start_date date NULL,
	reservation_end_date date NULL,
	last_updated_by int4 NULL,
	purpose int4 NULL,
	CONSTRAINT store_reserve_un UNIQUE (product_code, store_code),
	CONSTRAINT store_reserve_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT store_reserve_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);


--changeset kamuju.mahaveer@impactanalytics.co:store_reserve_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Adding new columns and renamed rfid_oh as per requirement
ALTER TABLE inventory_smart.store_reserve  ADD wip int4 NULL;
ALTER TABLE inventory_smart.store_reserve  ADD store_tier varchar NULL;
ALTER TABLE inventory_smart.store_reserve RENAME COLUMN rfid_store_oh TO epc_units;

