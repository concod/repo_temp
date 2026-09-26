--liquibase formatted sql
    --changeset vaibhav:halo_effect_sitewide_factor_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for halo_effect_sitewide_factor_opt

    CREATE TABLE price_promo_opt.tb_halo_effect_sitewide_factor_opt (
        s1_id INTEGER NULL,
        factor FLOAT NULL
    );

    CREATE INDEX idx_halo_effect_sitewide_factor_data_level_opt ON
    price_promo_opt.tb_halo_effect_sitewide_factor_opt
    USING BTREE (s1_id);