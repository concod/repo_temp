--liquibase formatted sql
--changeset liquibase:default_opt_constraint_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for default_opt_constraint
CREATE TABLE if not exists assort.default_opt_constraint (
    levels jsonb NOT NULL,
    special_classification character varying NOT NULL,
    attribute_value jsonb DEFAULT '{"min_size": 1, "increment": 1, "max_value": 500, "min_value": 1}'::jsonb
);
