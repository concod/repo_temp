--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:preallocation_po_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--global.preallocation_po_generic_schema_mapping definition

CREATE TABLE IF NOT EXISTS global.preallocation_po_generic_schema_mapping (
    source_column_name       VARCHAR NOT NULL,
    source_column_datatype   VARCHAR NOT NULL,
    required_in_product      BOOLEAN NOT NULL,
    generic_column_name      VARCHAR NOT NULL,
    is_pk                    BOOLEAN NOT NULL,
    generic_column_datatype  VARCHAR NOT NULL,
    formula                  VARCHAR NULL,
    is_attribute             BOOLEAN NOT NULL,
    is_hierarchy             BOOLEAN NOT NULL,
    hierarchy_level          INT NULL,
    is_null_allowed          BOOLEAN NOT NULL,
    unique_by                BOOLEAN NOT NULL,
    display_name             VARCHAR NOT NULL,
    is_partition_col         BOOLEAN NOT NULL,
    is_clustering_col        INT NULL,
    CONSTRAINT preallocation_po_generic_schema_mapping_pkey PRIMARY KEY (generic_column_name)
);
