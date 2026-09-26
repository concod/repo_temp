--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_store_code_dg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_store_code
CREATE TABLE if not exists "global".product_store_attributes_filter_store_code (
	psa_code varchar NOT NULL,
        l0_code varchar NULL,
        l0_name varchar NULL,
        l1_code varchar NULL,
        l1_name varchar NULL,
        l3_code varchar NULL,
        l3_name varchar NULL,
        l4_code varchar NULL,
        l4_name varchar NULL,
        store_code varchar NOT NULL,
        psa_name int4 NULL,
	CONSTRAINT product_store_attributes_filter_store_code_pk PRIMARY KEY (psa_code)
);
CREATE INDEX if not exists product_store_attributes_filter_store_code_l0_name_idx ON "global".product_store_attributes_filter_store_code (l0_name);

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_store_code_dg_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: psa_name to varchar from int
ALTER TABLE "global".product_store_attributes_filter_store_code ALTER COLUMN psa_name TYPE varchar;