--liquibase formatted sql
--changeset liquibase:product_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master
CREATE TABLE global.product_master (
    product_code character varying NOT NULL,
    product_name character varying NOT NULL,
    product_description text,
    price double precision,
    cost double precision,
    original_price double precision,
    active boolean DEFAULT true NOT NULL,
    clearance boolean DEFAULT false NOT NULL,
    receipt_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    replacement_product_codes _varchar DEFAULT '{}'::character varying[],
    reference_product_codes _varchar DEFAULT '{}'::character varying[],
    is_deleted bool default false,
    CONSTRAINT product_master_pk PRIMARY KEY (product_code)
);
ALTER TABLE global.product_master
    ADD CONSTRAINT product_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_master
    ADD CONSTRAINT product_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
