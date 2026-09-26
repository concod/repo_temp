--liquibase formatted sql
--changeset liquibase:tb_strategy_product_reco_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_product_reco_details - stores surrogate product level details per strategy
CREATE TABLE IF NOT EXISTS "price_markdown"."tb_strategy_product_reco_details" (
    product_level_id bigserial PRIMARY KEY,
    product_level_value jsonb,
    strategy_id int4
);

CREATE INDEX IF NOT EXISTS idx_strat_prod_reco_strategy_id
    ON price_markdown.tb_strategy_product_reco_details (strategy_id);
