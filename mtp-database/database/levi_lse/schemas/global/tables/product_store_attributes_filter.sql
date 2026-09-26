--liquibase formatted sql
--changeset himansh.bhardwaj:product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'global'
          AND table_name = 'product_store_attributes_filter'
    ) THEN
        CREATE TABLE "global".product_store_attributes_filter (
            psa_code text NOT NULL,
            l0_name text NULL,
            store_code text NOT NULL,
            psa_name int4 NULL,
            CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
        );
        CREATE INDEX product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name);
    END IF;
END $$;
