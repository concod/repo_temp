--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:etl_pipelines_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for etl_pipelines_details

CREATE TABLE IF NOT EXISTS data_platform.etl_pipelines_details
(
    job_id text COLLATE pg_catalog."default" NOT NULL,
    service_generated_job_id text COLLATE pg_catalog."default",
    service text COLLATE pg_catalog."default",
    job_type text COLLATE pg_catalog."default" NOT NULL,
    source text COLLATE pg_catalog."default" NOT NULL,
    target text COLLATE pg_catalog."default" NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status text COLLATE pg_catalog."default",
    created_by integer NOT NULL,
    source_table text COLLATE pg_catalog."default",
    target_table text COLLATE pg_catalog."default",
    overwrite_target boolean,
    message text COLLATE pg_catalog."default",
    cloud_infra text COLLATE pg_catalog."default",
    total_bytes_read bigint,
    total_rows_read bigint,
    total_bytes_written bigint,
    total_rows_written bigint,
    CONSTRAINT etl_pipelines_details_pkey PRIMARY KEY (job_id)
);


--changeset manoj.solanki@impactanalytics.co:etl_pipelines_details stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: adds schedule_job and config columns

ALTER TABLE data_platform.etl_pipelines_details
ADD COLUMN job_config TEXT NULL;

ALTER TABLE data_platform.etl_pipelines_details
ADD COLUMN scheduled_job VARCHAR NULL;