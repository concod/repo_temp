--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:pp_master_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: initial changeset for product_profile_master_v1

CREATE TABLE IF NOT EXISTS inventory_smart.product_profile_master (
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
	CONSTRAINT pp_ph_code CHECK (((((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL)))),
	CONSTRAINT pp_special_classification CHECK (((special_classification)::text = ANY (ARRAY[('ia-recommended'::character varying)::text, ('user-defined'::character varying)::text]))),
	CONSTRAINT product_profile_master_pk PRIMARY KEY (pp_code),
	CONSTRAINT product_profile_master_un UNIQUE (ph_code),
	CONSTRAINT product_profile_master_ph_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS product_profile_master_special_classification_idx ON inventory_smart.product_profile_master USING btree (special_classification);