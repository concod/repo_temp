--liquibase formatted sql
--changeset liquibase:product_asn_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_asn_master
CREATE TABLE global.product_asn_master (
    pasn_code serial4 NOT NULL,
    source_po_code varchar NOT NULL,
    source_asn_code varchar NOT NULL,
    product_code varchar NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    total_quantity real NOT NULL,
    description text,
    line_number integer
);
ALTER TABLE global.product_asn_master
    ADD CONSTRAINT product_asn_master_pk PRIMARY KEY (pasn_code);
