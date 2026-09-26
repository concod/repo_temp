--liquibase formatted sql
--changeset swapnil.bhange:oms_constraints_shipment_V2 stripComments:false splitStatements:false context:Release_1_0 labels:latest_inventory_version
--comment: initial changeset for oms_constraints_shipment_v2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_shipment (
    product_code varchar(256) NOT NULL,
    loc_code varchar(256) NOT NULL DEFAULT '-'::character varying,
    channel varchar(256) NOT NULL,
    vendor_code varchar(256) NOT NULL,
    vendor_name varchar(256) NULL,
    min_replenishment_quantity int4 NOT NULL DEFAULT 0,
    max_replenishment_quantity int4 NOT NULL DEFAULT 99999,
    order_multiple int4 NOT NULL DEFAULT 1,
    created_by int4 NULL,
    created_at timestamptz NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    column_updated varchar(256) NULL,
    id serial4 NOT NULL,
    moq_tolerance int4 NULL DEFAULT 100,
    CONSTRAINT check_oms_constraints_ordering CHECK ((min_replenishment_quantity <= max_replenishment_quantity)),
    CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);

