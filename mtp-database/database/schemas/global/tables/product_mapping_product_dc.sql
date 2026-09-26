--liquibase formatted sql
--changeset liquibase:product_mapping_product_dc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_dc
CREATE TABLE global.product_mapping_product_dc PARTITION OF global.product_mapping ( 
    CONSTRAINT product_mapping_product_dc_pk PRIMARY KEY (mapping_code),
    CONSTRAINT product_dc_mapping_un UNIQUE (product_code, dc_code),
    CONSTRAINT product_dc_mapping_not_null CHECK (product_code IS NOT NULL AND dc_code IS NOT NULL)
) FOR VALUES IN ('product_dc');

