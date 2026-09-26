--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:oms_orders_approved_cb_test_modified_schema_updated15 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_cb_test
--comment: initial changeset for oms_orders_approved_cb_test_modified_schema_updated

DROP TABLE IF EXISTS inventory_smart.oms_orders_approved;

CREATE TABLE inventory_smart.oms_orders_approved (
    id int8 NOT NULL,
    order_gen_type varchar NOT NULL,
    product_code varchar NOT NULL,
    vendor_code varchar NOT NULL,
    rop date NOT NULL,
    grade varchar NULL,
    order_quantity int4 NOT NULL,
    order_quantity_eaches int4 NOT NULL,
    pack_id varchar NULL,
    unit_cost float8 NOT NULL,
    order_cost float8 NULL,
    roq_constrained int4 NULL,
    roq_unconstrained int4 NULL,
    order_placement_date date NOT NULL,
    order_placement_recom_date date NOT NULL,
    expected_receipt_date date NULL,
    rop_ideal date NULL,
    lead_time int4 NULL,
    effective_lead_time int4 NULL,
    store_inv int4 NULL,
    dc_inv int4 NULL,
    system_inv int4 NULL,
    mrpc float4 NULL,
    min_order_quantity_sku int4 NULL,
    max_order_quantity int4 NULL,
    order_multiple int4 NULL,
    inventory_hold int4 NULL,
    order_status_id int8 DEFAULT 3 NOT NULL,
    created_by int4 NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    edit_by_date date NULL,
    is_deleted bool NULL,
    "comment" text NULL,
    article varchar(100) NULL,
    "size" varchar(100) NULL,
    "style" varchar(100) NULL,
    channel varchar(100) NULL,
    min_order_quantity_style int4 NULL,
    editable_expected_receipt_date date NULL,
    min_order_quantity_shipment int4 NULL,
    max_order_quantity_sku int4 NULL,
    max_order_quantity_style int4 NULL,
    max_order_quantity_shipment int4 NULL,
    loc_code varchar DEFAULT '-'::character varying NOT NULL,
    order_type varchar(100) NULL,
    CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, vendor_code, channel, loc_code, rop, expected_receipt_date, order_gen_type)
);
CREATE INDEX idx_oms_ord_approv_ord_status_id ON inventory_smart.oms_orders_approved USING btree (order_status_id);
CREATE INDEX idx_oms_ord_approv_product_code ON inventory_smart.oms_orders_approved USING btree (product_code);

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_update16 stripComments:false splitStatements:false context:MTP-80452 labels:created_new_table_update16
--comment: Added reconciliation_id column in OOA table for crackerbarrel
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS reconciliation_id varchar NULL;

--changeset raja.duraisamy@impactanalytics.co:order_batch_name_column_added stripComments:false splitStatements:false context:MTP-80452 labels:order_batch_name_column_added
--comment: order_batch_name_column_added in OOA table for crackerbarrel
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_batch_name varchar NULL;

--changeset raja.duraisamy@impactanalytics.co:approved_orders_pending_reconciliation stripComments:false splitStatements:false context:MTP-91512 labels:approved_orders_pending_reconciliation
--comment: Added approved_orders_pending_reconciliation column in OOA table for crackerbarrel
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS approved_orders_pending_reconciliation INT4 DEFAULT NULL;

--changeset aman.pareek@impactanalytics.co:oms_orders_approved_order_type_crackerbarrel_1 stripComments:false splitStatements:false context:Release_1_0 labels:order_type
--comment: Added order_type column in OOA table for crackerbarrel
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_type varchar(255) NULL;