--liquibase formatted sql
--changeset liquibase:product_store_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".product_store_mapping;
CREATE OR REPLACE VIEW "global".product_store_mapping
AS 
SELECT mapping_code,
    product_code,
    store_code,
    validity,
    l0_name
   FROM global.product_mapping_product_store
  WHERE 1=1;
