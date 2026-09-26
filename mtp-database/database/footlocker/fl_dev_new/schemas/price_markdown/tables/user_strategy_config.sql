--liquibase formatted sql
--changeset liquibase:user_strategy_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_strategy_config
CREATE TABLE "price_markdown"."user_strategy_config" (
    user_id int4 NOT NULL,
    strategy_id int4 NOT NULL,
    alert_message_disable_flag bool NOT NULL
)
;