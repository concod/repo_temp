--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_combination_v1 runAlways:true stripComments:false splitStatements:false context:tb_offer_type_penetration labels:tb_product_hierarchy_combination_v1
--comment: tb_product_hierarchy_combination_v1
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo_opt.tb_offer_type_penetration;
CREATE OR REPLACE VIEW price_promo_opt.tb_offer_type_penetration
AS SELECT t1.offer_type,
    t1.offer_x_value,
    t1.offer_x_type,
    t1.offer_y_value,
    t1.offer_y_type,
    t1.offer_z_value,
    t1.offer_z_type,
    t1.offer_pen_factor,
    t1.l0_id
   FROM price_promo_opt.tb_offer_type_penetration_version t1
  WHERE t1.version_code = global.get_table_version('price_promo_opt.tb_offer_type_penetration_version'::text);