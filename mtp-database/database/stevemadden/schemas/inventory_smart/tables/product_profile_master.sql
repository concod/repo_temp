--liquibase formatted sql
--changeset liquibase:product_profile_master stripComments:false splitStatements:false context:MTP-55972 labels: MTP-55972
--comment: MTP-55972
--rollback: SELECT 1

--  DROP TABLE IF EXISTS inventory_smart.product_profile_master;

CREATE TABLE if NOT exists inventory_smart.product_profile_master (
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
	CONSTRAINT pp_ph_code CHECK ((((((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL))))),
	CONSTRAINT pp_special_classification CHECK ((((special_classification)::text = ANY (ARRAY[('ia-recommended'::character varying)::text, ('user-defined'::character varying)::text])))),
	CONSTRAINT product_profile_master_pk PRIMARY KEY (pp_code),
	CONSTRAINT product_profile_master_un UNIQUE (ph_code),
	CONSTRAINT product_profile_master_ph_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT
);