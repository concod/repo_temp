--liquibase formatted sql
--changeset liquibase:product_store_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_constraints
-- inventory smart folder
CREATE TABLE "inventory_smart".product_store_constraints (
channel_code varchar null,
product_code varchar NOT null,
store_code varchar NOT null,
min_stock float null,
max_stock float null,
target_wos float null,
CONSTRAINT product_store_constraints_pk PRIMARY KEY (product_code,store_code)
);
