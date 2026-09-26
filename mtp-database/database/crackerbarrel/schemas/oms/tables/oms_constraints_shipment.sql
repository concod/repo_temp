--liquibase formatted sql
--changeset liquibase:oms_constraints_shipment_cb_test_not_exist_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_not_exist_added
--comment: initial changeset for oms_constraints_shipment for cb_test_not_exist_added

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_shipment (
    product_code varchar(100) NULL,
    loc_code varchar(100) NOT NULL DEFAULT 'none',
    channel varchar(100) NOT NULL,
    vendor_code varchar(100) NOT NULL,
    vendor_name varchar(100) NULL,
    min_replenishment_quantity int4 NULL,
    max_replenishment_quantity int4 NULL,
    order_multiple int4 NULL,
    default_mode varchar(100) NULL,
    created_by int4 NULL,
    created_at timestamptz NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    column_updated varchar(100) NULL,
    id serial4 NOT NULL,
   
    CONSTRAINT check_oms_constraints_ordering CHECK ((min_replenishment_quantity <= max_replenishment_quantity)),
    CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);











