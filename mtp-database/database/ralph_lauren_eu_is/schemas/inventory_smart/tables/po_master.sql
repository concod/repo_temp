--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS inventory_smart.po_master (
    po_code text NULL,
    dept_nbr int4 NULL,
    class_nbr int4 NULL,
    style_nbr int4 NULL,
    color_nbr text NULL,
    size_nbr text NULL,
    div_nbr int4 NULL,
    vendor_nbr int4 NULL,
    simple_vendor_cost float4 NULL,
    po_vendor_code int4 NULL,
    requirement_date date NULL,
    cancel_date date NULL,
    anticipate_date date NULL,
    article text NULL,
    dc_code int4 NULL,
    available_qty int4 NULL,
    product_code text NULL,
    allocated_qty int4 NULL,
    not_before_date date NULL,
    pack_type_id varchar NULL,
    channel varchar NULL,
    po_type varchar NULL,
    dest_whouse int4 NULL,
    s1_id _varchar NULL,
    raw_po_code varchar NULL,
    CONSTRAINT po_master_un UNIQUE (product_code, dc_code)
);