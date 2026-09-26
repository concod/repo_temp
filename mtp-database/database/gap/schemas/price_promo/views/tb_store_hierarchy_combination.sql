--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_store_hierarchy_combination_v4 runAlways:true stripComments:false splitStatements:false context:tb_store_hierarchy_combination labels:tb_store_hierarchy_combination
--comment: tb_store_hierarchy_combination
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo.tb_store_hierarchy_combination;
CREATE OR REPLACE VIEW price_promo.tb_store_hierarchy_combination
AS SELECT s0_id,
    s0_cuq,
    s1_id,
    s1_cuq,
    s2_id,
    s2_cuq,
    s3_id,
    s3_cuq,
    s4_id,
    s4_cuq,
    s5_id,
    s5_cuq,
    s6_id,
    s6_cuq,
    hierarchy_id
   FROM price_promo.tb_store_hierarchy_combination_version t1
  WHERE version_code = global.get_table_version('price_promo.tb_store_hierarchy_combination_version'::text);