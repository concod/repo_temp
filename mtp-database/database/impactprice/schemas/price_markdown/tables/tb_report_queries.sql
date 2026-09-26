--liquibase formatted sql
--changeset liquibase:tb_report_queries_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_report_queries  - added serial 4
CREATE TABLE price_markdown.tb_report_queries (
	id serial4 NOT NULL,
	query varchar NOT NULL,
	sheet_name varchar NULL,
	CONSTRAINT tb_report_queries_pkey PRIMARY KEY (id)
);