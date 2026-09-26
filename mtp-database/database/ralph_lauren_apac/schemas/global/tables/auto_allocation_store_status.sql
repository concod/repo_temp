--liquibase formatted sql
--changeset sameer.qureshi@impactanalytics.co:auto_allocation_store_status stripComments:false splitStatements:false context:auto_allocation_store_status labels:MTP-63788
--comment Added table auto_allocation_store_status
CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_store_status (
    store_code VARCHAR NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ not NULL,
    updated_by INT4 NULL,
	is_auto_allocation_active BOOLEAN NOT NULL
);

--changeset kamalesh.k@impactanalytics.co:auto_allocation_store_status stripComments:false splitStatements:false context:auto_allocation_store_status labels:MTP-63788
--comment adding primary key to store_code
ALTER TABLE inventory_smart.auto_allocation_store_status DROP CONSTRAINT IF EXISTS auto_allocation_store_status_store_code_key;
ALTER TABLE inventory_smart.auto_allocation_store_status 
ADD CONSTRAINT auto_allocation_store_status_pkey PRIMARY KEY (store_code);