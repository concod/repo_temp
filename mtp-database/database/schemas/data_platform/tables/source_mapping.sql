--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:source_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for source_mapping

CREATE TABLE IF NOT EXISTS data_platform.source_mapping
(
    tenant character varying COLLATE pg_catalog."default",
    "table" character varying COLLATE pg_catalog."default",
    connector character varying COLLATE pg_catalog."default",
    view character varying COLLATE pg_catalog."default",
    source_config character varying COLLATE pg_catalog."default",
    pull_type character varying COLLATE pg_catalog."default",
    replace boolean,
    schedule_interval character varying COLLATE pg_catalog."default",
    intermediate_table character varying COLLATE pg_catalog."default",
    filter character varying COLLATE pg_catalog."default",
    dataingestion_filterparam timestamp without time zone,
    filter_param timestamp without time zone,
    extraction_sync_dt timestamp without time zone,
    source_format_regex character varying COLLATE pg_catalog."default",
    inter_query_exec_order integer,
    partition_column character varying COLLATE pg_catalog."default",
    clustering_columns character varying COLLATE pg_catalog."default",
    query_partitioning_threshold integer,
    num_partitions integer,
    db_partition_column character varying COLLATE pg_catalog."default",
    field_delimiter character varying COLLATE pg_catalog."default",
    is_deleted boolean,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone
);