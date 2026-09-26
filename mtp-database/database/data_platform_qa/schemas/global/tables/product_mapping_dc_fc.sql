--liquibase formatted sql
--changeset liquibase:product_mapping_dc_fc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_dc_fc
CREATE TABLE global.product_mapping_dc_fc PARTITION OF global.product_mapping ( 
    CONSTRAINT product_mapping_dc_fc_pk PRIMARY KEY (mapping_code),
    CONSTRAINT dc_fc_mapping_un UNIQUE (dc_code, fc_code),
    CONSTRAINT dc_fc_mapping_not_null CHECK (dc_code IS NOT NULL AND fc_code IS NOT NULL)
) FOR VALUES IN ('dc_fc');
