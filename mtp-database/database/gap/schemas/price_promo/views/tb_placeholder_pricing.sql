--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_placeholder_pricing runAlways:true stripComments:false splitStatements:false context:tb_placeholder_pricing labels:tb_placeholder_pricing
--comment: tb_placeholder_pricing
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo.tb_placeholder_pricing;
CREATE OR REPLACE VIEW price_promo.tb_placeholder_pricing
AS SELECT 
    month,
    year,
    weighted_base_price,
    weighted_cost_price
FROM price_promo.tb_placeholder_pricing_version t1
WHERE version_code = global.get_table_version('price_promo.tb_placeholder_pricing_version'::text);