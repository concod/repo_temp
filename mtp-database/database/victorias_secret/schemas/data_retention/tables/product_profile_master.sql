--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_profile_master_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_profile_master backup
CREATE TABLE IF NOT EXISTS data_retention.product_profile_master (
	pp_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	ph_code int4 NULL,
	description text NULL,
	snapshot_date date NOT null,
	CONSTRAINT pp_ph_code_bkp CHECK (((((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL)))),
	CONSTRAINT pp_special_classification_bkp CHECK (((special_classification)::text = ANY (ARRAY[('ia-recommended'::character varying)::text, ('user-defined'::character varying)::text]))),
	CONSTRAINT product_profile_master_un_bkp UNIQUE (ph_code,snapshot_date)
)PARTITION BY LIST (snapshot_date);

