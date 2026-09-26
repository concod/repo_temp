--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bmsm_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.bmsm_config


-- Create the bmsm_config table with specific columns and constraints
CREATE TABLE price_promo.bmsm_config (
    id serial4 NOT NULL,
    x_value_type price_promo.x_value_type_enum NULL,
    y_value_type price_promo.y_value_type_enum NULL,
    "name" varchar NULL,
    CONSTRAINT bmsm_config_pkey PRIMARY KEY (id),
    CONSTRAINT bmsm_config_unique_x_y UNIQUE (x_value_type, y_value_type)
);

-- Create indexes to speed up queries filtering by x_value_type and y_value_type
CREATE INDEX idx_bmsm_config_x_value_type 
    ON price_promo.bmsm_config USING btree (x_value_type);
CREATE INDEX idx_bmsm_config_y_value_type 
    ON price_promo.bmsm_config USING btree (y_value_type);

