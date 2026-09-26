--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:actual_forex_rate  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

CREATE TABLE IF NOT EXISTS "pricesmart".actual_forex_rate (
	"date" date NOT NULL,
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	planned_conversion_multiplier float8 NULL,
	CONSTRAINT pk_actual_forex_rate PRIMARY KEY (date, source_currency_id, target_currency_id)
);