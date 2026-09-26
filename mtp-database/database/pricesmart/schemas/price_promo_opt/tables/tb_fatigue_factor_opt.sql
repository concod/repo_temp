--liquibase formatted sql
    --changeset vaibhav:fatigue_factor_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for fatigue_factor_opt

    CREATE TABLE price_promo_opt.tb_fatigue_factor_opt (
        l2_cid INTEGER NULL,
        s1_id INTEGER NULL,
        promo_duration INTEGER NULL,
        promo_day INTEGER NULL,
        factor FLOAT NULL
    );

    CREATE INDEX idx_fatigue_factor_opt ON
    price_promo_opt.tb_fatigue_factor_opt
    USING BTREE (s1_id, l2_cid, promo_duration, promo_day);