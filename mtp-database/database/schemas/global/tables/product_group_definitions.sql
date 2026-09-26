--liquibase formatted sql
--changeset liquibase:product_group_definitions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_definitions
CREATE TABLE global.product_group_definitions (
    pgd_code serial4 NOT NULL,
    name varchar NOT NULL,
    pseudo_code text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer
);
ALTER TABLE global.product_group_definitions
    ADD CONSTRAINT upgd_pk PRIMARY KEY (pgd_code);
CREATE UNIQUE INDEX product_group_definitions_name_idx ON global.product_group_definitions USING btree (name) WHERE (NOT is_deleted);
ALTER TABLE global.product_group_definitions
    ADD CONSTRAINT product_group_definations_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_group_definitions
    ADD CONSTRAINT product_group_definations_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
