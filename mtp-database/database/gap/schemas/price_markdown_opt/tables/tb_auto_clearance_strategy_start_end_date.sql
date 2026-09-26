--liquibase formatted sql
--changeset liquibase:tb_auto_clearance_strategy_start_end_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_auto_clearance_strategy_start_end_date

CREATE TABLE price_markdown_opt.tb_auto_clearance_strategy_start_end_date (
  calendar_config_id int4 NULL,
  strategy_start_date date NULL,
  strategy_end_date date NULL,
  trigger_config_id int4 NULL
);
