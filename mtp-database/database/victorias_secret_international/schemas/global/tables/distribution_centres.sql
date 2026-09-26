--liquibase formatted sql
--changeset liquibase:kanishka.parashar@impactanalytics.co:distribution_centres1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start1
--comment: initial changeset for distribution_centres1

CREATE TABLE IF NOT EXISTS "global".distribution_centres (
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
	CONSTRAINT dc_store_un UNIQUE (linked_store_code),
	CONSTRAINT distribution_centres_pkey PRIMARY KEY (dc_code),
	CONSTRAINT distribution_centres_fk FOREIGN KEY (linked_store_code) REFERENCES "global".store_master(store_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX dc_name_un ON global.distribution_centres USING btree (lower((name)::text));
CREATE UNIQUE INDEX distribution_centres_un ON global.distribution_centres USING btree (lower((name)::text), is_deleted);