--liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_planned_forex_rate_v1opt_version_v2 stripComments:false splitStatements:false context:marksmart_planned_forex_rate_v1opt_version
    --comment: initial changeset for marksmart_planned_forex_rate_v1opt_version_v2



CREATE TABLE IF NOT EXISTS "global".marksmart_planned_forex_rate_v1opt_version (
	version_code int4 NOT NULL,
	"date" date NOT NULL,
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	planned_conversion_multiplier float4 NOT NULL,
	source_currency text NOT NULL,
	target_currency text NOT NULL,
	CONSTRAINT marksmart_planned_forex_rate_v1opt_version_pkey_3 PRIMARY KEY (version_code, date, source_currency_id, target_currency_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_planned_forex_rate_version_id_idx_4 ON global.marksmart_planned_forex_rate_v1opt_version USING btree (version_code, date, source_currency_id, target_currency_id);
