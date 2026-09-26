--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_strategy_discount_level stripComments:false splitStatements:false context:Release_1_0 labels:discount_level_migration
--comment: tb_strategy_discount_level - partitioned table for discount level data with JSONB pcd_data per (product_level_id, store_level_id)

CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_discount_level (
    id serial NOT NULL,
    strategy_id integer NOT NULL,
    product_level_id bigint NOT NULL,
    store_level_id bigint NOT NULL,
    pcd_data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    ia_pcd_data jsonb,
    currency_id integer,
    channel_info varchar
) PARTITION BY LIST (strategy_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_strategy_discount_level 
    ON price_markdown.tb_strategy_discount_level (strategy_id, product_level_id, store_level_id);
