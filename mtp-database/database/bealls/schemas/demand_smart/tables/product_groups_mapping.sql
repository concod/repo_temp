--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:product_groups_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS "demand_smart".product_groups_mapping (
    pg_code int4 NOT NULL,
    product_code varchar NOT NULL,
    CONSTRAINT product_groups_mapping_pk PRIMARY KEY (pg_code,product_code),
    CONSTRAINT product_groups_mapping_fk FOREIGN KEY (pg_code) REFERENCES "demand_smart".product_groups(pg_code) ON DELETE CASCADE,
    CONSTRAINT product_groups_mapping_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
