--liquibase formatted sql
--changeset liquibase:tb_strategy_sku_store_count stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_sku_store_count
CREATE TABLE "price_markdown"."tb_strategy_sku_store_count" (
    strategy_id int4 NOT NULL,
    sku_count int8 NULL DEFAULT 0,
    store_count int8 NULL DEFAULT 0,
CONSTRAINT tb_strategy_sku_store_count_pkey PRIMARY KEY (strategy_id)
)
;