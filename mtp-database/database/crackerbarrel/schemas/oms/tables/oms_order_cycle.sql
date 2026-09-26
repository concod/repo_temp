--liquibase formatted sql
--changeset liquibase:oms_order_cycle_cb_test stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_order_cycle_cb_test pruthviraj.savanur

CREATE TABLE IF NOT EXISTS inventory_smart.oms_order_cycle (
    product_code VARCHAR  NULL,
    sh_name VARCHAR NULL,
    vendor_code VARCHAR NULL,
    fiscal_year_week INT4 NULL,
    order_placement_date DATE NULL,

    CONSTRAINT pk_oms_order_cycle PRIMARY KEY (product_code, vendor_code, fiscal_year_week, order_placement_date)
);