--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:store_attributes_filter_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter
CREATE TABLE "global".store_attributes_filter (
  store_description text NULL,
  special_classification varchar NULL,
  created_at timestamptz NULL,
  updated_at timestamptz NULL,
  created_by int4 NULL,
  updated_by int4 NULL,
  dc_code int4 NULL,
  fc_code int4 NULL,
  is_deleted bool NULL,
  store_name  varchar  NOT NULL,
  store_code  varchar  NOT NULL,
  channel varchar NOT NULL,
  active  bool  NOT NULL,
  s2_name  varchar NULL,
  s0_name  varchar NULL,
  s1_name  varchar NULL,
  zip  varchar  NULL,
  is_retail_store  bool  NOT NULL,
  retail_store_opened_at  date NULL,
  is_distribution_center  bool NOT NULL,
  CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
ALTER TABLE "global".store_attributes_filter ADD CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dc_name addition changeset for product_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dc_name varchar null;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_figs_ stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dc_name addition changeset for product_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS channel_name varchar null;

--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_figs_v stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dc_name addition changeset for product_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS like_store_id varchar null;

--changeset abhishek.sagar@impactanalytics.co:store_attributes_filter_rename_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment:  changing column name  col changeset for store_attributes_filter
ALTER TABLE "global".store_attributes_filter 
RENAME COLUMN retail_store_opened_at TO open_date;


--changeset abhishek.sagar@impactanalytics.co:store_attributes_filter_figs_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dc_name addition changeset for product_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dummy_store_id varchar null;