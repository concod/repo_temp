--liquibase formatted sql
--changeset liquibase:product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_groups
CREATE TABLE global.product_groups (
    pg_code serial4 NOT NULL,
    name varchar NOT NULL,
    special_classification varchar NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer,
    selection_metadata json DEFAULT '{}'::json NOT NULL,
    CONSTRAINT pg_name_check CHECK ((length((name)::text) > 0)),
    CONSTRAINT special_classification_for_pg CHECK (((special_classification)::text = ANY (ARRAY[('manual'::varchar)::text, ('objective'::varchar)::text, ('custom'::varchar)::text])))
);
ALTER TABLE global.product_groups
    ADD CONSTRAINT upg_pk PRIMARY KEY (pg_code);
CREATE UNIQUE INDEX product_groups_name_idx ON global.product_groups USING btree (name) WHERE (NOT is_deleted);
ALTER TABLE global.product_groups
    ADD CONSTRAINT product_groups_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_groups
    ADD CONSTRAINT product_groups_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_groups 
    ADD CONSTRAINT pg_unique_group_name_check EXCLUDE USING gist (lower((name)::text) WITH =) WHERE ((NOT is_deleted));
