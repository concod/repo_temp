--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:product_hierarchy_path_to_level_mapping_update6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes product_hierarchy_path_to_level_mapping_update
CREATE TABLE IF NOT EXISTS ada_configurator.product_hierarchy_path_to_level_mapping (
    hierarchy_path _text NOT NULL,
    level serial4 NOT NULL,
    CONSTRAINT unq_product_hierarchy_path UNIQUE (hierarchy_path)
);