--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:dc_service_levels_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for dc_service_levels backup
CREATE TABLE IF NOT EXISTS data_retention.dc_service_levels (
	"hierarchy" jsonb NULL,
	dc int4 NULL,
	target_wos int4 NULL,
	min_stock int4 NULL,
	safety_stock_method varchar NULL,
	safety_stock_units int4 NULL,
	service_level_percentage float8 NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	safety_stock_wos float8 NULL,
	id serial4 NOT NULL,
	product_code varchar(50) NULL,
	snapshot_date date NOT null,
	CONSTRAINT dc_service_levels_unique_bkp UNIQUE (product_code, dc, snapshot_date)
)PARTITION BY LIST (snapshot_date);

