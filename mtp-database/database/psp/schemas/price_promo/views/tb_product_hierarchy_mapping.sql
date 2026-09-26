--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_mapping runAlways:true stripComments:false splitStatements:false context:tb_product_hierarchy_mapping labels:tb_product_hierarchy_mapping
--comment: tb_product_hierarchy_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS price_promo.tb_product_hierarchy_mapping;
CREATE OR REPLACE VIEW price_promo.tb_product_hierarchy_mapping
AS SELECT t1.product_id,
    t1.hierarchy_id,
    t1.is_active,
    t1.version_code
   FROM price_promo.tb_product_hierarchy_mapping_version t1
  WHERE t1.version_code = global.get_table_version('price_promo.tb_product_hierarchy_mapping_version'::text);
