--liquibase formatted sql
--changeset adesh@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: initial changeset for latest_inventory_delta

CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory_delta (
    product_code text NULL,
    store_code text NULL,
    "date" date NULL,
    it int4 NULL,
    oh int4 NULL,
    oo int4 NULL,
    dc_available_qty int4 NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT latest_inventory_delta_un UNIQUE (product_code, store_code, "date")
);

--changeset adesh@impactanalytics.co:alter_updated_at_timestamp stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: alter updated_at column to timestamp
ALTER TABLE inventory_smart.latest_inventory_delta 
ALTER COLUMN updated_at TYPE TIMESTAMP;

--changeset adesh@impactanalytics.co:alter_updated_at_default_timestamp stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: alter updated_at column to default now()
ALTER TABLE inventory_smart.latest_inventory_delta 
ALTER COLUMN updated_at SET DEFAULT now();