--liquibase formatted sql
--changeset liquibase:replace_ia_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for replace_ia_tracker

CREATE TABLE price_markdown_opt.replace_ia_tracker (
	strategy_id int4 NULL,
	strategy_name varchar NULL,
	replace_flag int4 NULL,
	replace_date date NULL,
	time_taken float8 NULL
);