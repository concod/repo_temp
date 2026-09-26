--liquibase formatted sql
--changeset liquibase:distribution_centres stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for distribution_centres
CREATE TABLE "global".distribution_centres (
	dc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	is_active bool NULL DEFAULT true,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	is_deleted bool NULL DEFAULT false,
	lead_time int4 NULL,
	cost_per_km int4 NULL,
	linked_store_code varchar NOT NULL,
	CONSTRAINT dc_store_un UNIQUE (linked_store_code),
	CONSTRAINT distribution_centres_pkey PRIMARY KEY (dc_code)
);
CREATE UNIQUE INDEX dc_name_un ON global.distribution_centres USING btree (lower((name)::text));
CREATE UNIQUE INDEX distribution_centres_un ON global.distribution_centres USING btree (lower((name)::text), is_deleted);
ALTER TABLE "global".distribution_centres ADD CONSTRAINT distribution_centres_fk FOREIGN KEY (linked_store_code) REFERENCES "global".store_master(store_code) ON DELETE RESTRICT;
ALTER TABLE global.store_master ADD CONSTRAINT store_master_dc_fk FOREIGN KEY (dc_code) REFERENCES global.distribution_centres(dc_code) ON UPDATE SET NULL;

--changeset renugopal.sivaprakasam@impactanalytics.co:distribution_centres stripComments:false splitStatements:false context:Release_1_1 labels:not_null
--comment: Add strict constraints on not null
ALTER TABLE "global".distribution_centres ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE "global".distribution_centres ALTER COLUMN is_deleted SET NOT NULL;
