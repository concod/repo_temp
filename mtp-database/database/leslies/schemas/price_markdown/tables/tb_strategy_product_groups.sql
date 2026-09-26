--liquibase formatted sql
--changeset liquibase:tb_strategy_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_product_groups
CREATE TABLE "price_markdown"."tb_strategy_product_groups" (
    strategy_id int4 NOT NULL,
    product_group_id int4 NOT NULL
)
;