--liquibase formatted sql
--changeset pruthviraj.savanur@impactanalytics.co:oms_po_master_cb_test_not_exists_added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_oms_po_master_not_exists_added
--comment: initial changeset for oms_po_master_cb_test_not_exists_added

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
    po_id varchar NOT NULL,
    product_code varchar(100) NOT NULL,
    loc_code varchar(100) NOT NULL,
    channel varchar(100) NOT NULL,
    projected_delivery_date date NOT NULL,
    oo int4 NULL,
    it int4 NULL,
    order_id varchar NULL,
    asn_id varchar NULL,
    fiscal_year_week int4 NULL,
    pseudo_po int4 NULL,
    quantity_ordered int4 NULL,
    created_by int4 NULL,
    created_at timestamptz NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    column_updated varchar(100) NULL,
    id serial4 NOT NULL,
    CONSTRAINT pk_oms_po_master PRIMARY KEY (po_id, product_code, loc_code, channel, projected_delivery_date)
);