--liquibase formatted sql
--changeset liquibase:product_group_definitions_rules_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_definitions_rules_mapping
CREATE TABLE global.product_group_definitions_rules_mapping (
    pg_code integer,
    pgd_code integer NOT NULL,
    pgr_code integer NOT NULL
);
ALTER TABLE global.product_group_definitions_rules_mapping
    ADD CONSTRAINT pgdrm_def_rule_un UNIQUE (pgd_code, pgr_code);
ALTER TABLE global.product_group_definitions_rules_mapping
    ADD CONSTRAINT pgdrm_pg_def_rule_un UNIQUE (pg_code, pgd_code, pgr_code);
ALTER TABLE global.product_group_definitions_rules_mapping
    ADD CONSTRAINT pgdrm_pg_fk FOREIGN KEY (pg_code) REFERENCES global.product_groups(pg_code) ON DELETE CASCADE;
ALTER TABLE global.product_group_definitions_rules_mapping
    ADD CONSTRAINT pgdrm_pgd_fk FOREIGN KEY (pgd_code) REFERENCES global.product_group_definitions(pgd_code) ON DELETE CASCADE;
ALTER TABLE global.product_group_definitions_rules_mapping
    ADD CONSTRAINT pgdrm_pgr_fk FOREIGN KEY (pgr_code) REFERENCES global.product_group_rules(pgr_code) ON UPDATE RESTRICT ON DELETE RESTRICT;
