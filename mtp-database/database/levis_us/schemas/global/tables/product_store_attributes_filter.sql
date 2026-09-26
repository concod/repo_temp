--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for product_store_attributes_filter

-- Ensure the "global" schema exists
CREATE TABLE "global".product_store_attributes_filter (
    psa_code TEXT NULL,
    l0_name TEXT NULL,
    l1_name TEXT NULL,
    l2_name TEXT NULL,
    store_code TEXT NULL,
    psa_name TEXT NULL,
    store_grade TEXT NULL,
    store_cluster TEXT NULL,
    CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name,l1_name,l2_name);

--changeset sri.harsha@impactanalytics.co:product_store_attributes_filter_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:datatype change
--comment: added missing columns for product_store_attributes_filter
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN store_name text NULL;

--changeset sri.harsha@impactanalytics.co:product_store_attributes_filter_new_columns_v2 stripComments:false splitStatements:false context:Release_1_0 labels:datatype change
--comment: added missing columns for product_store_attributes_filter
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN l0_id text NULL;
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN l1_id text NULL;
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN l2_id text NULL;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
