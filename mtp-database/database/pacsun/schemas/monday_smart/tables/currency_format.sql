--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:currency_format stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for currency_format

CREATE TABLE monday_smart.currency_format (
	"label" varchar NOT NULL,
	code varchar NOT NULL,
	symbol varchar NOT NULL,
	format_json jsonb NOT NULL,
	is_active bool NOT NULL,
	CONSTRAINT currency_pk PRIMARY KEY (code)
);