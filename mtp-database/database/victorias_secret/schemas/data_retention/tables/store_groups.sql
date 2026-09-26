--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:store_groups_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for store_groups backup
CREATE TABLE IF NOT EXISTS data_retention.store_groups (
	sg_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	channel varchar NULL,
	application_code int4 NULL,
	extra jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_default bool DEFAULT false NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT sg_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT special_classification_for_sg CHECK (((special_classification)::text = ANY (ARRAY[('manual'::character varying)::text, ('custom'::character varying)::text, ('uploaded'::character varying)::text]))),
	CONSTRAINT usg_pk PRIMARY KEY (sg_code,snapshot_date)
) PARTITION BY LIST (snapshot_date);

