--liquibase formatted sql
--changeset liquibase:product_mapping_store_dc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_store_dc
CREATE TABLE global.product_mapping_store_dc PARTITION OF global.product_mapping ( 
    CONSTRAINT product_mapping_store_dc_pk PRIMARY KEY (mapping_code),
    CONSTRAINT store_dc_mapping_un UNIQUE (store_code, dc_code),
    CONSTRAINT store_dc_mapping_not_null CHECK (store_code IS NOT NULL AND dc_code IS NOT NULL)
) FOR VALUES IN ('store_dc');
