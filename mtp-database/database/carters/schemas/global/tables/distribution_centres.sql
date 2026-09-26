--liquibase formatted sql
--changeset shameel.zeshan@impactanalytics.co:distribution_centres stripComments:false splitStatements:false context: db_sync labels:distribution_centres
--comment: initial changeset for distribution_centres
CREATE TABLE IF NOT EXISTS "global".distribution_centres (
	dc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	is_active bool NOT NULL DEFAULT true,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	is_deleted bool NOT NULL DEFAULT false,
	lead_time int4 NULL,
	cost_per_km int4 NULL,
	linked_store_code varchar NOT NULL,
	dc_rank int4 NULL,
	CONSTRAINT dc_store_un UNIQUE (linked_store_code),
	CONSTRAINT distribution_centres_pkey PRIMARY KEY (dc_code),
	CONSTRAINT distribution_centres_fk FOREIGN KEY (linked_store_code) REFERENCES "global".store_master(store_code) ON DELETE RESTRICT
);