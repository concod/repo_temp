--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:actual_forex_rate stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

CREATE TABLE "global".actual_forex_rate (
	"date" date NOT NULL,
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	planned_conversion_multiplier float4 NULL,
	CONSTRAINT actual_forex_rate_pk PRIMARY KEY (date, source_currency_id, target_currency_id)
);
