--liquibase formatted sql
--changeset liquibase:oms_late_orders_report_cb_uat stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_late_orders_report_cb_uat zakia.firdous

CREATE TABLE IF NOT EXISTS oms.oms_late_orders_report (
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

--changeset raja.duraisamy@impactanalytics.co:oms_late_orders_report_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_late_orders_report based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_late_orders_report_product_loc ON oms.oms_late_orders_report(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_late_orders_report_vendor_code ON oms.oms_late_orders_report(article, size, product_code, loc_code, channel);
CREATE INDEX IF NOT EXISTS idx_oms_late_orders_report_po_id ON oms.oms_late_orders_report(po_id);

--changeset raja.duraisamy@impactanalytics.co:index_oms_late_orders_report_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_late_orders_report
DROP INDEX IF EXISTS oms.idx_oms_late_orders_report_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_late_orders_report_vendor_code;
DROP INDEX IF EXISTS oms.idx_oms_late_orders_report_po_id;