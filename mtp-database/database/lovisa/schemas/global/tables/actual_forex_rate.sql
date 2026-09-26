--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:actual_forex_rate_15092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

CREATE TABLE "global".actual_forex_rate (
	"date" date NOT NULL,
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	planned_conversion_multiplier float4 NOT NULL,
	source_currency text NOT NULL,
	target_currency text NOT NULL,
	CONSTRAINT actual_forex_rate_pk PRIMARY KEY (date, source_currency_id, target_currency_id),
	CONSTRAINT af_conversion_multiplier_not_zero CHECK (planned_conversion_multiplier > 0)
);
CREATE INDEX actual_forex_rate_date_idx ON "global".actual_forex_rate USING btree (date);

