--liquibase formatted sql
--changeset liquibase:tb_strategy_sku_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_sku_store_mapping
CREATE TABLE "price_markdown"."tb_strategy_sku_store_mapping" (
    strategy_id int4 NOT NULL,
    product_id int8 NOT NULL,
    store_id int8 NOT NULL,
    include_from_date date NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NULL DEFAULT now(),
    created_by int4 NOT NULL DEFAULT 0,
    updated_by int4 NULL DEFAULT 0,
    product_level_id int8 NULL DEFAULT '-200'::integer,
    store_level_id int8 NULL DEFAULT '-200'::integer,
    product_level_value text NULL DEFAULT 'Overall'::text,
    store_level_value text NULL DEFAULT 'Overall'::text,
    cost float8 NULL,
    price float8 NULL
)PARTITION BY LIST (strategy_id)
;


--changeset liquibase:tb_strategy_sku_store_mapping_channel_info_addition stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added new column channel_info
ALTER TABLE price_markdown.tb_strategy_sku_store_mapping ADD channel_info varchar DEFAULT 'Omni' NULL;

--changeset liquibase:tb_strategy_sku_store_mapping_product_and_store_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added index on product and store
CREATE INDEX tb_strategy_sku_store_mapping_product_id_idx ON price_markdown.tb_strategy_sku_store_mapping (product_id,store_id);