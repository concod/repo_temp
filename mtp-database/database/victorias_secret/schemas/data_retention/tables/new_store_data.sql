--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:new_store_data_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for new_store_data backup
CREATE TABLE IF NOT EXISTS data_retention.new_store_data (
	store_code varchar NOT NULL,
	store_name varchar NULL,
	remodel_flag bool DEFAULT false NULL,
	snapshot_date date NOT null,
	CONSTRAINT new_store_data_pk unique (store_code,snapshot_date)
)PARTITION BY LIST (snapshot_date);

