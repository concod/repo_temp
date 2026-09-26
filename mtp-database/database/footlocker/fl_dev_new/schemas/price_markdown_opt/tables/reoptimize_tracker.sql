--liquibase formatted sql
--changeset liquibase:reoptimize_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reoptimize_tracker

CREATE TABLE price_markdown_opt.reoptimize_tracker (
	strategy_id int4 NULL,
	strategy_name varchar NULL,
	reoptimize_flag int4 NULL,
	reoptimize_date date NULL,
	time_taken float8 NULL
);