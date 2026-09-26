--liquibase formatted sql
--changeset liquibase:tb_store_hierarchy_combination runAlways:true stripComments:false splitStatements:false context:tb_store_hierarchy_combination labels:tb_store_hierarchy_combination
--comment: tb_store_hierarchy_combination
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo.tb_store_hierarchy_combination;
CREATE OR REPLACE VIEW price_promo.tb_store_hierarchy_combination
AS SELECT t1.s0_id,
    t1.s0_cid,
    t1.s0_cuq,
    t1.hierarchy_id
   FROM price_promo.tb_store_hierarchy_combination_version t1
  WHERE t1.version_code = global.get_table_version('price_promo.tb_store_hierarchy_combination_version'::text);