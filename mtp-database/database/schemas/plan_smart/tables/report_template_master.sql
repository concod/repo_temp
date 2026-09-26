--liquibase formatted sql
--changeset liquibase:report_template_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_template_master
CREATE TABLE plan_smart.report_template_master (
	template_id serial4 NOT NULL,
	template_name varchar NOT NULL,
	template_type varchar NOT NULL,
	view_type varchar NOT NULL,
	levels jsonb NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL
);