--liquibase formatted sql
--changeset adesh.kumar@impactanalytics.co:dc_pack_configuration_generic_v1 stripComments:false splitStatements:false context:MTP-generic labels:generic
--comment: Generic dc_pack_configuration table
--rollback: SELECT 1

CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_configuration (
    article varchar NOT NULL,
    pack_type_id varchar NOT NULL,
    pack_type varchar NOT NULL,
    product_code varchar NOT NULL,
    "size" varchar NOT NULL,
    units_in_pack int4 NOT NULL,
    pack_description varchar NULL,
    pack_size varchar NULL,
    color_code varchar NULL,
    upc_number varchar NULL,
    vendor_cd varchar NULL,
    dim varchar NULL,
    parent_article varchar NULL,
    display_article varchar NULL,
    CONSTRAINT dc_pack_configuration_unique_key UNIQUE (product_code, pack_type_id, pack_description)
);
