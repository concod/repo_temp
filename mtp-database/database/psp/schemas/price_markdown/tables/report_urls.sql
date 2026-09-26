--liquibase formatted sql
--changeset liquibase:report_urls_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_urls - added serial 4
CREATE TABLE price_markdown.report_urls (
	report_id serial4 NOT NULL,
	url varchar NULL,
	CONSTRAINT report_urls_pkey PRIMARY KEY (report_id)
);