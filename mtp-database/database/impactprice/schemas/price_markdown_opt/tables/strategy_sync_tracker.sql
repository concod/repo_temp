--liquibase formatted sql
--changeset liquibase:strategy_sync_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for strategy_sync_tracker

CREATE TABLE price_markdown_opt.strategy_sync_tracker (
	strategy_id text NOT NULL,
	strategy_name varchar NOT NULL,
	strategy_sync_flag_ia int4 NOT NULL,
	strategy_sync_flag_fin int4 NOT NULL,
	strategy_sync_date date NOT NULL,
	time_taken float8 NULL
);