--liquibase formatted sql
--changeset liquibase:product_group_rules stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_rules
CREATE TABLE global.product_group_rules (
    pgr_code serial4 NOT NULL,
    name varchar NOT NULL,
    attribute_name varchar NOT NULL,
    attribute_values _varchar DEFAULT ARRAY[]::varchar[] NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer,
    CONSTRAINT pgr_name_check CHECK ((length((name)::text) > 0))
);
ALTER TABLE global.product_group_rules
    ADD CONSTRAINT upgr_pk PRIMARY KEY (pgr_code);
ALTER TABLE global.product_group_rules
    ADD CONSTRAINT product_group_rules_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_group_rules
    ADD CONSTRAINT product_group_rules_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
