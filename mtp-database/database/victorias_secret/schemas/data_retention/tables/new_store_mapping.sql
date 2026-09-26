--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:new_store_mapping_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for new_store_mapping backup
CREATE TABLE IF NOT EXISTS  data_retention.new_store_mapping (
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL,
	hierarchies jsonb NULL,
	multiplier float4 NULL,
	temp_store_code varchar NULL,
	temp_hierarchies jsonb NULL,
	temp_multiplier float4 NULL,
	remodel_flag bool NULL,
	is_deleted bool DEFAULT false NULL,
	snapshot_date date NOT null,
	CONSTRAINT new_store_mapping_pk_bkp PRIMARY KEY (store_code, sister_store_code,snapshot_date)
)PARTITION BY LIST (snapshot_date);

