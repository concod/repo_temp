--liquibase formatted sql
--changeset liquibase:oms_late_orders_report_test stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_late_orders_report 

CREATE TABLE IF NOT EXISTS inventory_smart.oms_late_orders_report (
    po_id VARCHAR  NULL,
    product_code VARCHAR  NULL,
    style VARCHAR NULL,
    article VARCHAR  NULL,
    size VARCHAR NULL,
    channel VARCHAR  NULL,
    loc_code VARCHAR  NULL,
    vendor_code VARCHAR NULL,
    vendor_name VARCHAR NULL,
    order_date DATE  NULL,
    projected_delivery_date DATE  NULL,
    dc_oh INT4  NULL,
    total_order_qty INT4  NULL,
    total_order_cost FLOAT8  NULL,
    total_received_qty INT4  NULL,
    total_received_cost FLOAT8  NULL,
    late_order_qty INT4 NULL,
    late_order_cost FLOAT8 NULL,
    order_qty_four_weeks INT4 NULL,
    order_cost_four_weeks FLOAT8 NULL,
    CONSTRAINT pk_oms_late_orders_report PRIMARY KEY (vendor_code, po_id, style,article, size, product_code,loc_code, channel)
);