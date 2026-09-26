--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:distribution_centres_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for distribution_centres backup
CREATE TABLE IF NOT EXISTS  data_retention.distribution_centres (
	dc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	is_deleted bool DEFAULT false NOT NULL,
	lead_time int4 NULL,
	cost_per_km int4 NULL,
	linked_store_code varchar NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT dc_store_un_bkp UNIQUE (linked_store_code,name,snapshot_date)
)PARTITION BY LIST (snapshot_date);

