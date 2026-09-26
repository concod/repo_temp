--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_product_hierarchy_combination_v1 runAlways:true stripComments:false splitStatements:false context:tb_offer_type_penetration labels:tb_product_hierarchy_combination_v1
--comment: tb_product_hierarchy_combination_v1
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo_opt.tb_offer_type_penetration;
CREATE OR REPLACE VIEW price_promo_opt.tb_offer_type_penetration
AS SELECT 
    offer_type,
    offer_x_value,
    offer_x_type,
    offer_y_value,
    offer_y_type,
    offer_z_value,
    offer_z_type,
    offer_pen_factor,
    l0_id
FROM price_promo_opt.tb_offer_type_penetration_version t1
WHERE version_code = global.get_table_version('price_promo_opt.tb_offer_type_penetration_version'::text);