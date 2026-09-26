--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_groups_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_groups backup
CREATE TABLE IF NOT EXISTS data_retention.product_groups (
	pg_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	selection_metadata json DEFAULT '{}'::json NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT pg_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT special_classification_for_pg CHECK (((special_classification)::text = ANY (ARRAY[('manual'::character varying)::text, ('objective'::character varying)::text, ('custom'::character varying)::text]))),
	CONSTRAINT upg_pk UNIQUE (pg_code, snapshot_date)
) PARTITION BY LIST (snapshot_date);

