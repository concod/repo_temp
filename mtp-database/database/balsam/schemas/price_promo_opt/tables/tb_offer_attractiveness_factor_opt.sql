--liquibase formatted sql
    --changeset vaibhav:offer_attractiveness_factor_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for offer_attractiveness_factor_opt

    CREATE TABLE price_promo_opt.tb_offer_attractiveness_factor_opt (
        l2_cid INTEGER NULL,
        min_discount_range INTEGER NULL,
        max_discount_range INTEGER NULL,
        brand_category VARCHAR(100) NULL,
        min_msrp_range INTEGER NULL,
        max_msrp_range INTEGER NULL,
        factor FLOAT NULL,
        min_product_concentration INTEGER NULL
    );

    CREATE INDEX idx_offer_attractiveness_opt ON
    price_promo_opt.tb_offer_attractiveness_factor_opt
    USING BTREE (l2_cid, min_discount_range, max_discount_range, brand_category, min_msrp_range, max_msrp_range, min_product_concentration);