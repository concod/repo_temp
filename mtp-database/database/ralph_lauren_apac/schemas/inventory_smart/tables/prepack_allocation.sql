--liquibase formatted sql
--changeset shreehari.aramanadka@impactanalytics.co:prepack_allocation stripComments:false splitStatements:false context:prepack_allocation labels:MTP-46905
--comment synced with db for latest_inventory
CREATE TABLE inventory_smart.store_prepack_allocation (
    store_code VARCHAR NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ not NULL,
    updated_by INT4 NULL,
    is_prepack_eligible BOOLEAN NOT NULL
);