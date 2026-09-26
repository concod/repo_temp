--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:cloud_task_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cloud_task_status

CREATE TABLE IF NOT EXISTS data_platform.cloud_task_status
(
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    task_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    task_name character varying(255) COLLATE pg_catalog."default",
    url character varying COLLATE pg_catalog."default",
    payload character varying COLLATE pg_catalog."default",
    status character varying(255) COLLATE pg_catalog."default",
    message character varying COLLATE pg_catalog."default",
    CONSTRAINT cloud_task_status_task_id_key UNIQUE (task_id)
);