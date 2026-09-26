--liquibase formatted sql
--changeset liquibase:actual_forex_rate stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

DROP TABLE IF EXISTS "global".actual_forex_rate;

CREATE TABLE "global".actual_forex_rate (
	"date" date NULL,
	source_currency_id int4 NULL,
	target_currency_id int4 NULL,
	planned_conversion_multiplier numeric(18, 6) NULL,
	source_currency varchar(50) NULL,
	target_currency varchar(50) NULL,
    CONSTRAINT actual_forex_rate_pk PRIMARY KEY (date, source_currency_id, target_currency_id)
);
