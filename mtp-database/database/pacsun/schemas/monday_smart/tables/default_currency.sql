--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:default_currency stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for default_currency


CREATE TABLE monday_smart.default_currency (
	code varchar NOT NULL,
	emailid varchar NOT NULL,
	userid int4 NULL
);