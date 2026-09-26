--liquibase formatted sql
--changeset liquibase:store_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_groups
CREATE TABLE "global".store_groups (
	sg_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	special_classification varchar NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	channel varchar NULL,
	application_code int4 NULL,
	CONSTRAINT sg_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT special_classification_for_sg CHECK (((special_classification)::text = ANY (ARRAY[('manual'::character varying)::text, ('custom'::character varying)::text]))),
	CONSTRAINT usg_pk PRIMARY KEY (sg_code)
);
CREATE UNIQUE INDEX store_groups_name_idx ON global.store_groups USING btree (name) WHERE (NOT is_deleted);
ALTER TABLE global.store_groups
    ADD CONSTRAINT store_groups_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.store_groups
    ADD CONSTRAINT store_groups_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.store_groups 
	ADD CONSTRAINT sg_unique_group_name_check EXCLUDE USING gist (lower((name)::text) WITH =) WHERE ((NOT is_deleted));

--changeset biplab.malarkar@impactanalytics.co:store_groups_updated_v1 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for store_groups
alter table global.store_groups
	add column extra jsonb not null default '{}';

alter table global.store_groups
	drop constraint special_classification_for_sg;

alter table global.store_groups 
	add CONSTRAINT special_classification_for_sg CHECK (((special_classification)::text = ANY (ARRAY[('manual'::character varying)::text, ('custom'::character varying)::text, ('uploaded'::character varying)::text])));

--changeset raj.mohan@impactanalytics.co:store_groups_updated_version_2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-60404 added is_default column to store group
--comment: MTP-60404 added is_default column to store group
alter table global.store_groups
	add column if not exists is_default bool not null default false;