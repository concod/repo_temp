--liquibase formatted sql
--changeset liquibase:product_order_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_order_master
CREATE TABLE global.product_order_master (
    po_code serial4 NOT NULL,
    source_po_code varchar NOT NULL,
    product_code varchar NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    total_quantity real NOT NULL,
    description text,
    line_number integer
);
ALTER TABLE global.product_order_master
    ADD CONSTRAINT product_order_master_pk PRIMARY KEY (po_code);
ALTER TABLE global.product_order_master
    ADD CONSTRAINT product_order_master_un UNIQUE (source_po_code, product_code);
ALTER TABLE global.product_order_master
    ADD CONSTRAINT product_order_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_order_master
    ADD CONSTRAINT product_order_master_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
