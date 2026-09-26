--liquibase formatted sql
--changeset vikash.kumar@impactanalytics.co:product_store_attributes_filter_initial stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter

CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter (
    psa_code TEXT NOT NULL,
    l0_name TEXT NULL,
    store_code TEXT NOT NULL,
    psa_name INT4 NULL,
    l1_name TEXT NULL,
    CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);

CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_name_idx 
ON "global".product_store_attributes_filter (l0_name);

CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_l1_name_idx 
ON "global".product_store_attributes_filter USING btree (l0_name, l1_name);

--changeset vikash.kumar@impactanalytics.co:change psa_name data type to text stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: change psa_name data type to text

ALTER TABLE "global".product_store_attributes_filter
  ALTER COLUMN psa_name TYPE text
  USING psa_name::text;
