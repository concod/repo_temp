 --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_country_master_version_v2 stripComments:false splitStatements:false context:marksmart_country_master_version
    --comment: initial changeset for marksmart_country_master_version_v2



CREATE TABLE IF NOT EXISTS "global".marksmart_country_master_version (
	version_code int4 NOT NULL,
	country_id int4 NOT NULL,
	country_code text NOT NULL,
	country_name text NOT NULL,
	CONSTRAINT tb_country_master_pk_2 PRIMARY KEY (version_code, country_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX mkd_country_s1_id_idx_4 ON global.marksmart_country_master_version USING btree (version_code, country_id);