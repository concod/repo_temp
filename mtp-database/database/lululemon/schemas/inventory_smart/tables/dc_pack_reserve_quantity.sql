--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity

CREATE TABLE inventory_smart.dc_pack_reserve_quantity (
    article varchar NULL,
    dc_code int4 NULL,
    channel varchar NULL,
    pack_type_id varchar NULL,
    incoming_po_30 int4 NULL,
    incoming_po_31_60 int4 NULL,
    incoming_po_61_90 int4 NULL,
    quantity int4 NULL,
    "type" varchar NULL,
    is_reserved bool DEFAULT false NULL,
    percentage float4 NULL,
    updated_at timestamptz NULL);


