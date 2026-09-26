--liquibase formatted sql
--changeset liquibase:tb_placeholder_targets stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_targets
CREATE TABLE "price_promo"."tb_placeholder_targets" (
    promo_id int4 NOT NULL,
    status int2 NOT NULL,
    revenue float8 NULL,
    inventory int4 NULL,
    discount int4 NULL,
CONSTRAINT tb_placeholder_targets_pkey PRIMARY KEY (promo_id)
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_placeholder_targets_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.tb_placeholder_targets table to match the DEV environment schema by dropping all columns and indexes, then recreating them

-- Add missing columns to match DEV environment
ALTER TABLE price_promo.tb_placeholder_targets
    ADD COLUMN units_target float8 NULL,
    ADD COLUMN gross_margin_target float8 NULL,
    ADD COLUMN gross_margin_percent_target float8 NULL;

-- Drop existing indexes to match DEV environment
DROP INDEX IF EXISTS idx_tb_placeholder_targets_promo_id;
DROP INDEX IF EXISTS idx_tb_placeholder_targets_status;
DROP INDEX IF EXISTS idx_tb_placeholder_targets_promo_id_status;


--changeset abhishek.singh@impactanalytics.co:tb_placeholder_targets_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.tb_placeholder_targets table to fix revenue_target

-- Add missing columns to match DEV environment
ALTER TABLE price_promo.tb_placeholder_targets
    DROP COLUMN IF EXISTS revenue,
    ADD COLUMN revenue_target float8 NULL;
    
