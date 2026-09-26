--liquibase formatted sql
--changeset liquibase:cleanup_policies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cleanup_policies
CREATE TABLE IF NOT EXISTS assort_smart.cleanup_policies
(
    id serial4 NOT NULL,
    sl_no integer NOT NULL,
    schema_name text NOT NULL,
    table_name text  NOT NULL,
    cleanup_strategy text  NOT NULL,
    cleanup_frequency text  NOT NULL,
    cleanup_condition text  NOT NULL,
    last_cleanup_time timestamp NULL,
    stl_column character varying(50),
    CONSTRAINT cleanup_policies_pkey PRIMARY KEY (id)
);