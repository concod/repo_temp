--liquibase formatted sql
--changeset liquibase:product_uda_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_uda_master

-- check with products team to accommodated in product attribute filter
CREATE TABLE "inventory_smart".product_uda_master (
product_code varchar NOT NULL,
uda_id varchar NOT NULL,
uda_desc varchar NULL,
uda_value varchar NOT NULL,
uda_value_desc varchar null,
CONSTRAINT product_uda_master_pk PRIMARY KEY (product_code,uda_id,uda_value)
);