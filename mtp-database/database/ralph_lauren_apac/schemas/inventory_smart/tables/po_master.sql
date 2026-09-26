--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:po_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.po_master definition

DROP TABLE if exists inventory_smart.po_master;
CREATE TABLE IF NOT EXISTS inventory_smart.po_master (
    po_code VARCHAR NULL,
    AX_Class_ID int4 NULL,
    AX_Subclass_ID int4 NULL,
    style_nbr VARCHAR NULL,
    color_nbr VARCHAR NULL,
    size_nbr VARCHAR NULL,
    AX_Label_ID int4 NULL,
    vendor_nbr int4 NULL,
    simple_vendor_cost float4 NULL,
    po_vendor_code int4 NULL,
    requirement_date date NULL,
    cancel_date date NULL,
    anticipate_date date NULL,
    article VARCHAR NULL,
    dc_code int4 NULL,
    available_qty int4 NULL,
    product_code VARCHAR NULL,
    allocated_qty int4 NULL,
    not_before_date date NULL,
    pack_type_id VARCHAR NULL,
    channel VARCHAR NULL,
    po_type VARCHAR NULL,
    dest_whouse int4 NULL,
    s1_id _varchar NULL,
    raw_po_code VARCHAR NULL,
    retail_region VARCHAR NULL,
    CONSTRAINT po_master_un_key UNIQUE (product_code,dc_code)
);