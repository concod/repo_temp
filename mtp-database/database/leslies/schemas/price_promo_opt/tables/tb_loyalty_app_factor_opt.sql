--liquibase formatted sql
    --changeset vaibhav:loyalty_app_factor_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for loyalty_app_factor_opt

    CREATE TABLE price_promo_opt.tb_loyalty_app_factor_opt (
        s1_id INTEGER NULL,
        loyalty_factor FLOAT NULL,
        app_only_factor FLOAT NULL
    );

    CREATE INDEX idx_loyalty_app_factor_opt ON
    price_promo_opt.tb_loyalty_app_factor_opt
    USING BTREE (s1_id);