--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tier_discounts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for creating the price_promo.tier_discounts table


-- Create the table
CREATE TABLE price_promo.tier_discounts (
    tier_id int4 NOT NULL,
    sub_tier_id serial4 NOT NULL,
    offer_x_value float8 NULL,
    offer_x_type varchar NULL,
    offer_y_value float8 NULL,
    offer_y_type varchar NULL,
    offer_z_value float8 NULL,
    offer_z_type varchar NULL,
    display_name varchar NULL,
    CONSTRAINT tier_discounts_pkey PRIMARY KEY (sub_tier_id)
);

-- Add foreign key constraint
ALTER TABLE price_promo.tier_discounts
    ADD CONSTRAINT fk_tier_discounts_tier_id
    FOREIGN KEY (tier_id)
    REFERENCES price_promo.tier_master (tier_id)
    ON DELETE CASCADE;

-- Create index on tier_id
CREATE INDEX idx_tier_discounts_tier_id 
    ON price_promo.tier_discounts USING btree (tier_id);

