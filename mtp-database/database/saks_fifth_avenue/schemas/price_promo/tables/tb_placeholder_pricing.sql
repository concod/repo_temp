--liquibase formatted sql
--changeset liquibase:tb_placeholder_pricing stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_pricing
CREATE TABLE "price_promo"."tb_placeholder_pricing" (
    month int4 NULL,
    year int2 NULL,
    weighted_base_price numeric NULL,
    weighted_cost_price numeric NULL
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_placeholder_pricing_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.tb_placeholder_pricing table to match the DEV environment schema by dropping all columns and indexes, then recreating them

-- Drop existing columns
ALTER TABLE price_promo.tb_placeholder_pricing
    DROP COLUMN IF EXISTS weighted_base_price,
    DROP COLUMN IF EXISTS weighted_cost_price;

-- Recreate columns to match DEV environment
ALTER TABLE price_promo.tb_placeholder_pricing
    ADD COLUMN weighted_base_price float8 NULL,
    ADD COLUMN weighted_cost_price float8 NULL;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_tb_placeholder_pricing_month;
DROP INDEX IF EXISTS idx_tb_placeholder_pricing_year;
DROP INDEX IF EXISTS idx_tb_placeholder_pricing_month_year;

-- Recreate indexes to match DEV environment
CREATE INDEX idx_tb_placeholder_pricing_month_year 
    ON price_promo.tb_placeholder_pricing ("month", "year");

