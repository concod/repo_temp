--liquibase formatted sql
--changeset himansh.bhardwaj:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'inventory_smart'
          AND table_name = 'po_master'
    ) THEN
        CREATE TABLE inventory_smart.po_master (
            po_code varchar NOT NULL,
            product_code varchar NOT NULL,
            requirement_date date NOT NULL,
            channel varchar NOT NULL,
            allocated_qty int4 NULL,
            available_qty int4 NULL,
            dc_code int4 NOT NULL,
            not_before_date date NULL,
            CONSTRAINT po_master_un UNIQUE (po_code, product_code, dc_code, channel, requirement_date, not_before_date),
            CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
            CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
        );
    END IF;
END $$;
