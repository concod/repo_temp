--liquibase formatted sql
--changeset aiyush.prasad@impactanalytics.co:product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for product_store_attributes_filter

CREATE TABLE "global".product_store_attributes_filter (
    psa_code TEXT NULL,
    l0_name TEXT NULL,
    l1_name TEXT NULL,
    store_code TEXT NULL,
    psa_name TEXT NULL,
    CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name,l1_name);

--changeset aiyush.prasad@impactanalytics.co:product_store_attributes_filter_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:column addition
--comment: added missing columns for product_store_attributes_filter
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN store_name text NULL;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
