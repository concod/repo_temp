--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:oms_late_orders_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_late_orders_store
--comment: initial changeset for oms_late_orders_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_late_orders_report_store ( 
    vendor_code VARCHAR NULL,
    vendor_name VARCHAR NULL,
    po_id VARCHAR  NULL,
    product_code VARCHAR  NULL,
    style VARCHAR NULL,
    article VARCHAR  NULL,
    size VARCHAR NULL,
    channel VARCHAR  NULL,
    store_code VARCHAR  NULL,
    order_date DATE  NULL,
    projected_delivery_date DATE  NULL,
    store_oh INT4  NULL,
    total_order_qty INT4  NULL,
    total_order_cost FLOAT8  NULL,
    total_received_qty INT4  NULL,
    total_received_cost FLOAT8  NULL,
    late_order_qty INT4 NULL,
    late_order_cost FLOAT8 NULL,
    order_qty_four_weeks INT4 NULL,
    order_cost_four_weeks FLOAT8 NULL);