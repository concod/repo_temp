--liquibase formatted sql
    --changeset vaibhav:offer_concentration_factor_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for offer_concentration_factor_opt

    CREATE TABLE price_promo_opt.tb_offer_concentration_factor_opt (
        s1_id INTEGER NULL,
        l2_cid INTEGER NULL,
        promo_duration INTEGER NULL,
        promo_day INTEGER NULL,
        factor FLOAT NULL,
        week_dampening_factor FLOAT NULL
    );

    CREATE INDEX idx_offer_concentration_factor_opt ON
    price_promo_opt.tb_offer_concentration_factor_opt
    USING BTREE (s1_id, l2_cid, promo_duration, promo_day);