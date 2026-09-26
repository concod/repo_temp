--liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_actual_forex_rate_v1opt_version stripComments:false splitStatements:false context:marksmart_actual_forex_rate_v1opt_version
    --comment: initial changeset for marksmart_actual_forex_rate_v1opt_version


CREATE TABLE "global".marksmart_actual_forex_rate_v1opt_version (
	version_code int4 NOT NULL,
	"date" date NOT NULL,
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	planned_conversion_multiplier float4 NOT NULL,
	source_currency text NOT NULL,
	target_currency text NOT NULL,
	CONSTRAINT actual_forex_rate_pk_1 PRIMARY KEY (version_code, date, source_currency_id, target_currency_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX mkd_actual_forex_rate_v1opt_s1_id_idx_1 ON global.marksmart_actual_forex_rate_v1opt_version USING btree (version_code, date, source_currency_id, target_currency_id);