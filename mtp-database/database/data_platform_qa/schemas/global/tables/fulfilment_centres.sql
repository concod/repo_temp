--liquibase formatted sql
--changeset liquibase:fulfilment_centres stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fulfilment_centres
CREATE TABLE "global".fulfilment_centres (
	fc_code serial4 NOT NULL,
	"name" varchar(50) NULL,
	is_active bool NULL DEFAULT true,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	is_deleted bool NULL DEFAULT false,
	lead_time int4 NULL,
	cost_per_km int4 NULL,
	CONSTRAINT fc_name_check CHECK (((length((name)::text) > 0) AND (length(regexp_replace((name)::text, '[a-zA-Z0-9\-\.\w]+'::text, ''::text, 'g'::text)) = 0))),
	CONSTRAINT fulfilment_centres_pkey PRIMARY KEY (fc_code)
);
CREATE UNIQUE INDEX fulfilment_centres_un ON global.fulfilment_centres USING btree (lower((name)::text));
