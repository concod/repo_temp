--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:dc_transfer_constraints_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for dc_transfer_constraints backup
CREATE TABLE IF NOT EXISTS data_retention.dc_transfer_constraints (
	"hierarchy" jsonb NULL,
	source_dc int4 NULL,
	destination_dc int4 NULL,
	min_transfer_quantity int8 NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	id bigserial NOT NULL,
	product_code varchar(50) NULL,
	snapshot_date date NOT null,
	CONSTRAINT dc_transfer_constraints_unique_bkp UNIQUE (product_code, source_dc, destination_dc,snapshot_date)
) PARTITION BY LIST (snapshot_date);

