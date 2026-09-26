--liquibase formatted sql
--changeset liquibase:product_profile_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_master
CREATE TABLE inventory_smart.product_profile_master (
	pp_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	ph_code int4 NULL,
	description text NULL,
	CONSTRAINT pp_ph_code CHECK (((((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL)))),
	CONSTRAINT pp_special_classification CHECK (((special_classification)::text = ANY (ARRAY[('ia-recommended'::character varying)::text, ('user-defined'::character varying)::text]))),
	CONSTRAINT product_profile_master_pk PRIMARY KEY (pp_code),
	CONSTRAINT product_profile_master_un UNIQUE (ph_code)
);
CREATE INDEX product_profile_master_special_classification_idx ON inventory_smart.product_profile_master USING btree (special_classification);
ALTER TABLE inventory_smart.product_profile_master ADD CONSTRAINT product_profile_master_ph_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT;
ALTER SEQUENCE inventory_smart.product_profile_master_pp_code_seq RESTART WITH 5000000;

--changeset liquibase:product_profile_master_alter_constraints_v1 stripComments:false splitStatements:false context:MTP-113456 labels:MTP-113456
--comment: MTP-113456: product_profile_master_alter_constraints

ALTER TABLE inventory_smart.product_profile_master
DROP CONSTRAINT IF EXISTS pp_ph_code,
DROP CONSTRAINT IF EXISTS pp_special_classification,
ADD CONSTRAINT pp_ph_code CHECK (
    (((special_classification)::text = 'user-defined'::text) AND (ph_code IS NULL)) OR
    (((special_classification)::text = 'ia-recommended'::text) AND (ph_code IS NOT NULL)) OR
    (((special_classification)::text = 'ia-edited'::text) AND (ph_code IS NULL))
),
ADD CONSTRAINT pp_special_classification CHECK (
    ((special_classification)::text = ANY (
        ARRAY[
            ('ia-recommended'::character varying)::text,
            ('user-defined'::character varying)::text,
            ('ia-edited'::character varying)::text
        ]
    ))
);

--changeset liquibase:product_profile_master_add_article stripComments:false splitStatements:false context:MTP-113456 labels:MTP-113456
--comment: MTP-113456: product_profile_master_alter_scehma_add_article
ALTER TABLE inventory_smart.product_profile_master ADD article varchar NULL;

--changeset liquibase:product_profile_master_drop_article stripComments:false splitStatements:false context:MTP-113456 labels:MTP-113456
--comment: MTP-113456: product_profile_master_alter_schema_drop_article
ALTER TABLE inventory_smart.product_profile_master DROP COLUMN IF EXISTS article;