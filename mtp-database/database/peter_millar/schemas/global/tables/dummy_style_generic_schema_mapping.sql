--liquibase formatted sql
--changeset shivam.tiwari@impactanalytics.co:dummy_style_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dummy_style_generic_schema_mapping
CREATE TABLE IF NOT EXISTS "global".dummy_style_generic_schema_mapping (
    source_column_name varchar NULL,
    source_column_datatype varchar NULL,
    required_in_product bool DEFAULT true NOT NULL,
    generic_column_name varchar NULL,
    is_pk bool DEFAULT false NOT NULL,
    generic_column_datatype varchar NOT NULL,
    formula varchar NULL,
    is_attribute bool DEFAULT false NOT NULL,
    is_hierarchy bool DEFAULT false NOT NULL,
    hierarchy_level int4 NULL,
    is_null_allowed bool DEFAULT false NOT NULL,
    unique_by bool NULL,
    display_name varchar NULL,
    is_partition_col bool NULL,
    is_clustering_col int4 NULL,
    CONSTRAINT dummy_style_gen_col_name_un UNIQUE (generic_column_name)
);
