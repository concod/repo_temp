--liquibase formatted sql
--changeset linu.nazil:rcl_priority_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_priority_mapping
CREATE TABLE global.rcl_priority_mapping(
    rcl_code serial4 primary key,
    "level" _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
    rcl_priority int4 not null,
    CONSTRAINT rcl_level_check CHECK ((cardinality(level) > 0)),
    constraint rcl_priority_uk UNIQUE (rcl_priority)
);
CREATE UNIQUE INDEX rcl_priority_level_uk ON global.rcl_priority_mapping USING btree (global.form_array(level));

--changeset linu.nazil:rcl_priority_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing the level of table to level + module code from level alone
alter table global.rcl_priority_mapping add column module_code int null references global.module_master(module_code);
drop index global.rcl_priority_level_uk;
CREATE UNIQUE INDEX rcl_priority_level_uk ON global.rcl_priority_mapping USING btree ((global.form_array(level)), module_code);

alter table global.rcl_priority_mapping drop constraint rcl_priority_uk;
alter table global.rcl_priority_mapping add constraint rcl_priority_module_uk unique(rcl_priority, module_code);

--changeset linu.nazil:rcl_priority_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing the level of table to level + module code from level alone
ALTER TABLE global.rcl_priority_mapping DROP COLUMN if exists rcl_code;