--liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_currency_country_mapping_version_v2 stripComments:false splitStatements:false context:marksmart_currency_country_mapping_version
    --comment: initial changeset for marksmart_currency_country_mapping_version_v2


CREATE TABLE if not exists "global".marksmart_currency_country_mapping_version (
	version_code int4 NOT NULL,
	id int4 NOT NULL,
	territory_id int4 NOT NULL,
	country_id int4 NOT NULL,
	currency_id int4 NOT NULL,
	dominating_currency_id int4 NOT NULL,
	default_currency_id int4 NOT NULL,
	CONSTRAINT tb_currency_country_master_pk_4 PRIMARY KEY (version_code, territory_id, country_id, currency_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX mkd_country_id_currency_id_idx_4 ON global.marksmart_currency_country_mapping_version USING btree (version_code, country_id, territory_id, currency_id);
