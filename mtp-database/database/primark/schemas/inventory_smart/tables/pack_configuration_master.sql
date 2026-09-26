--liquibase formatted sql
--changeset liquibase:pack_configuration_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pack_configuration_master
-- check with VB,will have to check signet in inventory smart
CREATE TABLE "inventory_smart".pack_configuration_master (
master_sku_id varchar NULL,
pack_id varchar NOT NULL,
pack_qty float8 NULL,
product_code varchar NOT NULL,
quantity varchar NULL,
pack_type varchar null,
CONSTRAINT pack_configuration_master_pk PRIMARY KEY (pack_id,product_code)
);