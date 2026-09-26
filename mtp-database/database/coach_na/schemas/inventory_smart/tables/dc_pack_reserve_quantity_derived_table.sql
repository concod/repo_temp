--liquibase formatted sql
--changeset draksharapu.rajesh:dc_pack_reserve_quantity_derived_table_sync_test stripComments:false splitStatements:false context:Release_1.1 labels:dc_pack_reserve_quantity_derived_table_sync
--comment: Synchronizing dc_pack_reserve_quantity_derived_table with UAT schema

CREATE TABLE inventory_smart.dc_pack_reserve_quantity_derived_table (
    article VARCHAR NOT NULL,
    date date NOT NULL,
    reserve_quantity INT4 NULL,
    CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (article, "date")
);