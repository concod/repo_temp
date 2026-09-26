--liquibase formatted sql
--changeset liquibase:tb_strategy_status_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_status_config
CREATE TABLE "price_markdown"."tb_strategy_status_config" (
    status_id int4 NULL,
    status_name varchar NULL,
    status_type int2 NULL DEFAULT 0,
    display_order int2 NULL
)
;