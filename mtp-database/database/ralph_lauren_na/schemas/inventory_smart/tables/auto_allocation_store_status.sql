--liquibase formatted sql
--changeset sameer.qureshi@impactanalytics.co:auto_allocation_store_status stripComments:false splitStatements:false context:auto_allocation_store_status labels:MTP-46092
--comment synced with db for latest_inventory
CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_store_status (
    store_code VARCHAR NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ not NULL,
    updated_by INT4 NULL,
	is_auto_allocation_active BOOLEAN NOT NULL
);

--changeset mohammed.huzaif@impactanalytics.co:MTP-99438-Update_constraints_for_new_Store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:MTP-99438 
--comment: MTP-99438 - adding unique key and primary key
ALTER TABLE inventory_smart.auto_allocation_store_status DROP CONSTRAINT IF EXISTS auto_allocation_store_status_store_code_key;
ALTER TABLE inventory_smart.auto_allocation_store_status ADD CONSTRAINT auto_allocation_store_status_store_code_key UNIQUE (store_code);

ALTER TABLE inventory_smart.auto_allocation_store_status ADD CONSTRAINT auto_allocation_store_status_store_code_pk PRIMARY KEY (store_code);