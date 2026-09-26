--liquibase formatted sql
--changeset liquibase:tb_strategy_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_hierarchy
CREATE TABLE "price_markdown"."tb_strategy_hierarchy" (
    strategy_id int4 NOT NULL,
    hierarchy_level int2 NOT NULL,
    hierarchy_value int8 NOT NULL,
    is_product_hierarchy int2 NOT NULL
)PARTITION BY LIST (strategy_id)
;