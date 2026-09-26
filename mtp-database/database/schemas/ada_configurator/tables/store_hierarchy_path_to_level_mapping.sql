--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:store_hierarchy_path_to_level_mapping_update6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes store_hierarchy_path_to_level_mapping_update
CREATE TABLE IF NOT EXISTS ada_configurator.store_hierarchy_path_to_level_mapping (
    hierarchy_path _text NOT NULL,
    level serial4 NOT NULL,
    CONSTRAINT unq_store_hierarchy_path UNIQUE (hierarchy_path)
);