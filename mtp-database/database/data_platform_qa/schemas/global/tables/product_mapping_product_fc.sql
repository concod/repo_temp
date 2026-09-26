--liquibase formatted sql
--changeset liquibase:product_mapping_product_fc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_fc
CREATE TABLE global.product_mapping_product_fc PARTITION OF global.product_mapping ( 
    CONSTRAINT product_mapping_product_fc_pk PRIMARY KEY (mapping_code),
    CONSTRAINT product_fc_mapping_un UNIQUE (product_code, fc_code),
    CONSTRAINT product_fc_mapping_not_null CHECK (product_code IS NOT NULL AND fc_code IS NOT NULL)
) FOR VALUES IN ('product_fc');
