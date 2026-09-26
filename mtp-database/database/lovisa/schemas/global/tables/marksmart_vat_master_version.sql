 --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_vat_master_version_v2 stripComments:false splitStatements:false context:marksmart_vat_master_version
    --comment: initial changeset for marksmart_vat_master_version_v2


CREATE TABLE if not exists "global".marksmart_vat_master_version (
	version_code int4 NOT NULL,
	s1_id int4 NOT NULL,
	vat_percentage float4 NOT NULL,
	CONSTRAINT tb_vat_master_pk_1 PRIMARY KEY (version_code, s1_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX mkd_vat_s1_id_idx_4 ON global.marksmart_vat_master_version USING btree (version_code, s1_id);
