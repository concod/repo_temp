--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_product_hierarchy_combination_v3 runAlways:true stripComments:false splitStatements:false context:tb_product_hierarchy_combination labels:tb_product_hierarchy_combination
--comment: tb_product_hierarchy_combination
--rollback: SELECT 1
DROP VIEW IF EXISTS price_promo.tb_product_hierarchy_combination;
CREATE OR REPLACE VIEW price_promo.tb_product_hierarchy_combination
AS SELECT DISTINCT l0_id,
    l0_cid,
    l0_cuq,
    l1_id,
    l1_cid,
    l1_cuq,
    l2_id,
    l2_cid,
    l2_cuq,
    l3_id,
    l3_cid,
    l3_cuq,
    version_code,
    hierarchy_id,
    l4_id,
    l4_cid,
    l4_cuq,
    l5_id,
    l5_cid,
    l5_cuq,
    l6_id,
    l6_cid,
    l6_cuq,
    l7_id,
    l7_cid,
    l7_cuq
   FROM price_promo.tb_product_hierarchy_combination_version t1
  WHERE version_code = global.get_table_version('price_promo.tb_product_hierarchy_combination_version'::text);