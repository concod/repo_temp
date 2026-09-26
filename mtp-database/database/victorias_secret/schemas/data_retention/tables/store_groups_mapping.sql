--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:store_groups_mapping_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for store_groups_mapping backup
CREATE TABLE IF NOT EXISTS data_retention.store_groups_mapping (
	sg_code int4 NOT NULL,
	store_code varchar NOT NULL,
	ref_sg_code int4 NULL,
	snapshot_date date NOT null,
	CONSTRAINT store_groups_mapping_pk PRIMARY KEY (sg_code, store_code,snapshot_date)
) PARTITION BY LIST (snapshot_date);

