--liquibase formatted sql
--changeset liquibase:automated_strategy_opt_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for automated_strategy_opt_tracker

CREATE TABLE price_markdown_opt.automated_strategy_opt_tracker (
	strategy_id int4 NULL,
	strategy_name varchar NULL,
	input_payload jsonb NULL,
	optimize_flag int4 NULL DEFAULT 0,
	optimize_date date NULL DEFAULT CURRENT_DATE,
	time_taken float8 NULL DEFAULT 0
);