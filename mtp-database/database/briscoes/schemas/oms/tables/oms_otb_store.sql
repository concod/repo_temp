--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_otb_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_otb_store_V2S
--comment: initial changeset for oms_otb_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_otb_store (
    id serial4 NOT NULL,
    product_code VARCHAR NOT NULL,
    store_code VARCHAR NOT NULL,
    channel VARCHAR NOT NULL,
    fiscal_year_week INTEGER NOT NULL,
    mfp_units INTEGER NULL,
    approved_otb INTEGER NULL,
    otb INTEGER NULL,
    total_units INTEGER NULL,
    recom_receipts INTEGER NULL,
    fiscal_year_week_receipt int4 NULL,
    CONSTRAINT pk_oms_otb_store PRIMARY KEY (product_code, store_code, channel, fiscal_year_week)
);