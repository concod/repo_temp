--liquibase formatted sql
--changeset liquibase:process_execution_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for process_execution_tracker

CREATE TABLE price_markdown_opt.process_execution_tracker (
	id serial4 NOT NULL,
	process_name varchar(50) NULL,
	flag_description varchar(255) NULL,
	start_flag int4 NULL,
	end_flag int4 NULL,
	updated_date date NULL
);