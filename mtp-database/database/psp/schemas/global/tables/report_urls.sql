--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:report_urls_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: table_create_1 for report_urls_1
CREATE TABLE "global".report_urls (
	report_id serial4 NOT NULL,
	url varchar NULL,
	application varchar NOT NULL,
	CONSTRAINT report_urls_pkey PRIMARY KEY (report_id)
);