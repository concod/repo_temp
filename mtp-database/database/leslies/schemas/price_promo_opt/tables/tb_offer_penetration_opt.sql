--liquibase formatted sql
    --changeset vaibhav:offer_penetration_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for offer_penetration_opt

    CREATE TABLE price_promo_opt.tb_offer_penetration_opt (
        s1_id INTEGER NULL,
        offer_type VARCHAR(100) NULL,
        offer_description VARCHAR(100) NULL,
        max_tier INTEGER NULL,
        offer_x_value INTEGER NULL,
        offer_x_type VARCHAR(100) NULL,
        offer_y_value INTEGER NULL,
        offer_y_type VARCHAR(100) NULL,
        offer_z_value INTEGER NULL,
        z_type VARCHAR(100) NULL,
        offer_pen_factor FLOAT NULL,
        channel VARCHAR(100) NULL,
        tiered_offer_indicator INTEGER NULL
    );

    CREATE INDEX idx_offer_penetration_opt ON
    price_promo_opt.tb_offer_penetration_opt
    USING BTREE (offer_type, offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, max_tier, tiered_offer_indicator, s1_id);