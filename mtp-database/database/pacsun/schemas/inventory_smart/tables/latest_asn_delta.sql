--liquibase formatted sql
--changeset adesh@impactanalytics.co:latest_asn_delta stripComments:false splitStatements:false context:MTP-91288 ignore:false labels:MTP-91288
--comment: initial changeset for latest_asn_delta

CREATE TABLE IF NOT EXISTS inventory_smart.latest_asn_delta (
    po_code varchar not null,
    product_code varchar not null,
    dc_code varchar not null,
    requirement_date date not null,
    channel varchar not null,
    available_qty int4 null,
    receiver_number varchar null,
    allocated_qty int4 null,
    not_before_date date null default '2000-01-01',
    updated_at timestamptz not null default NOW(),
    constraint latest_asn_delta_un unique (
        po_code,
        product_code,
        dc_code,
        requirement_date
    ),
    constraint latest_asn_delta_product_fk foreign key (product_code) references global.product_master(product_code) on delete cascade,
    constraint latest_asn_delta_dc_fk foreign key (dc_code) references global.store_attributes_filter(store_code) on delete cascade
);
--changeset adesh@impactanalytics.co:latest_asn_delta_v1 stripComments:false splitStatements:false context:MTP-96133 ignore:false labels:MTP-96133
--comment: MTP-96133:initial changeset for latest_asn_delta
DROP TABLE IF EXISTS inventory_smart.latest_asn_delta;
CREATE TABLE IF NOT EXISTS inventory_smart.latest_asn_delta (
    asn_code varchar NOT NULL,
    asn_id varchar NOT NULL,
    asn_item varchar NULL,
    po_code varchar NOT NULL,
    po_id varchar NOT NULL,
    po_item varchar NULL,
    requirement_date date NOT NULL,
    channel varchar NOT NULL,
    available_qty int4 NULL,
    dc_code varchar NOT NULL,
    pack_type_id varchar NULL,
    article varchar NULL,
    number_of_allocations int4 DEFAULT 0,
    handling_type varchar NULL,
    receiver_number varchar NULL,
    allocated_qty int4 NULL,
    not_before_date date DEFAULT '2000-01-01'::date NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT latest_asn_delta_un UNIQUE (asn_id, pack_type_id)
);

--changeset adesh@impactanalytics.co:latest_asn_delta_v2 stripComments:false splitStatements:false context:MTP-96133 ignore:false labels:MTP-96133
--comment: MTP-96133:latest_asn_delta_v2
ALTER TABLE inventory_smart.latest_asn_delta ALTER COLUMN dc_code TYPE int4 USING dc_code::integer;

--changeset adesh@impactanalytics.co:add-col-latest_asn_delta stripComments:false splitStatements:false context:MTP-96133 ignore:false labels:MTP-96133
--comment: MTP-96133:add-col-latest_asn_delta
ALTER TABLE inventory_smart.latest_asn_delta ALTER COLUMN dc_code TYPE varchar USING dc_code::varchar;

--changeset adesh@impactanalytics.co:add-col-latest_asn_delta_v2 stripComments:false splitStatements:false context:MTP-99371 ignore:false labels:MTP-99371
--comment: MTP-99371:add-col-vi-date-asn-active-flag
ALTER TABLE inventory_smart.latest_asn_delta
ADD COLUMN IF NOT EXISTS vi_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS active_asn_flag BOOLEAN DEFAULT true;

--changeset adesh@impactanalytics.co:add-col-latest_asn_delta_v3 stripComments:false splitStatements:false context:MTP-100749 ignore:false labels:MTP-100749
--comment: MTP-100749:drop-requirement-date-not-null-constraint
ALTER TABLE inventory_smart.latest_asn_delta ALTER COLUMN requirement_date DROP NOT NULL;