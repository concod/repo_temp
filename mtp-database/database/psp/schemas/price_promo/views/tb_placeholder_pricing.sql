--liquibase formatted sql
--changeset liquibase:tb_placeholder_pricing runAlways:true stripComments:false splitStatements:false context:tb_placeholder_pricing labels:tb_placeholder_pricing
--comment: tb_placeholder_pricing
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo.tb_placeholder_pricing;
CREATE OR REPLACE VIEW price_promo.tb_placeholder_pricing
AS SELECT t1.month,
    t1.year,
    t1.weighted_base_price,
    t1.weighted_cost_price
   FROM price_promo.tb_placeholder_pricing_version t1
  WHERE t1.version_code = global.get_table_version('price_promo.tb_placeholder_pricing_version'::text);