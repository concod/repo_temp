--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:new_store_attributes_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for new_store_attributes backup
CREATE TABLE IF NOT EXISTS data_retention.new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
	reservation_start_date date NULL,
	effective_date date NULL,
	temp_store_code varchar NULL,
	temp_opening_date date NULL,
	temp_legacy_store_mapping_date date NULL,
	temp_closing_date date NULL,
	temp_effective_date date NULL,
	legacy_store_code varchar NULL,
	legacy_closing_date date NULL,
	remodel_flag bool DEFAULT false NULL,
	is_deleted bool DEFAULT false NULL,
	snapshot_date date NOT null,
	CONSTRAINT pk_bkp UNIQUE (store_code, snapshot_date)
)PARTITION BY LIST (snapshot_date);

