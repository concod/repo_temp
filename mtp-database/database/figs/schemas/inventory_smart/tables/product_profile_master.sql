--liquibase formatted sql
--changeset keerthi.vardhani@impactanalytics.co:product_profile_master_figs stripComments:false splitStatements:false context:Release_1_0 labels:figs_latest_inventory
--comment: initial changeset for product_profile_master

CREATE TABLE if not exists inventory_smart.product_profile_master (
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
	CONSTRAINT pp_ph_code CHECK (((((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL)) OR (((special_classification)::text = 'ia-edited'::text) AND (ph_code IS NULL)))),
	CONSTRAINT pp_special_classification CHECK (((special_classification)::text = ANY (ARRAY[('ia-recommended'::character varying)::text, ('user-defined'::character varying)::text, ('ia-edited'::character varying)::text]))),
	CONSTRAINT product_profile_master_pk PRIMARY KEY (pp_code),
	CONSTRAINT product_profile_master_un UNIQUE (ph_code),
	CONSTRAINT product_profile_master_ph_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS product_profile_master_special_classification_idx ON inventory_smart.product_profile_master USING btree (special_classification);

--changeset keerthi.vardhani@impactanalytics.co:product_profile_master_figs_rename stripComments:false splitStatements:false context:columns_add labels:col-rename
--comment: added columns
ALTER TABLE inventory_smart.product_profile_master 
			ADD COLUMN IF NOT EXISTS article varchar NULL;

--changeset keerthi.vardhani@impactanalytics.co:product_profile_master_figs_ stripComments:false splitStatements:false context:columns_add labels:col-rename
--comment: dropping columns
ALTER TABLE inventory_smart.product_profile_master
        DROP COLUMN IF EXISTS article;
