--liquibase formatted sql
--changeset liquibase:enable_module_level_table_uam stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for enable_module_level_table_uam
CREATE TABLE IF NOT EXISTS global.enable_module_level_table_uam (
    module_code INT PRIMARY KEY,
    enable_uam BOOLEAN NOT NULL DEFAULT FALSE
);
