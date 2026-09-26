--liquibase formatted sql
--changeset liquibase:actualization_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actualization_tracker

CREATE TABLE price_markdown_opt.actualization_tracker (
	strategy_id text NOT NULL,
	strategy_name varchar NOT NULL,
	actualization_flag int4 NOT NULL,
	actualization_date date NOT NULL,
	time_taken float8 NULL
);