--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:etl_pipelines_details_pagination_test stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for etl_pipelines_details_pagination_test

CREATE TABLE IF NOT EXISTS data_platform.etl_pipelines_details_pagination_test
(
    job_id text COLLATE pg_catalog."default",
    service_generated_job_id text COLLATE pg_catalog."default",
    service text COLLATE pg_catalog."default",
    job_type text COLLATE pg_catalog."default",
    source text COLLATE pg_catalog."default",
    target text COLLATE pg_catalog."default",
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status text COLLATE pg_catalog."default",
    created_by integer,
    source_table text COLLATE pg_catalog."default",
    target_table text COLLATE pg_catalog."default",
    total_bytes_processed bigint,
    total_rows_processed bigint,
    overwrite_target boolean,
    message text COLLATE pg_catalog."default",
    cloud_infra text COLLATE pg_catalog."default"
);