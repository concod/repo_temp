--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:base_pricing_restaurant_bp_uam_product_hierarchy_levels_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Table to configure dynamic product hierarchy mapping for UAM

CREATE TABLE IF NOT EXISTS base_pricing_restaurant.bp_uam_product_hierarchy_levels (
    id                    SERIAL PRIMARY KEY,
    global_hierarchy_name TEXT    NOT NULL,
    bp_hierarchy_name     TEXT    NOT NULL,
    bp_hierarchy_id       TEXT    NOT NULL,
    level_order           INTEGER NOT NULL,
    is_active             BOOLEAN DEFAULT TRUE
);
