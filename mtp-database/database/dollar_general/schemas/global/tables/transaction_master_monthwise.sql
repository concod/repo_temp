--liquibase formatted sql
--changeset liquibase:transaction_master_month_wise stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for transaction_master_month_wise
CREATE TABLE global.transaction_master_month_wise (
        l1_name text NULL,
        l2_name text NULL,
        l3_name text NULL,
        l4_name text NULL,
        primary_sku text NULL,
        store_code text NULL,
        fiscal_year int4 NULL,
        fiscal_month int4 NULL,
        qty int4 NULL,
        price float4 NULL,
        "size" text NULL,
        day_count int4 NULL,
        count int4 NULL
);

--changeset liquibase:transaction_master_month_wise_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for transaction_master_month_wise_2
ALTER TABLE "global".transaction_master_month_wise ADD CONSTRAINT transaction_master_month_wise_pk PRIMARY KEY (primary_sku, store_code, fiscal_year, fiscal_month);
