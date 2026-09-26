--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:productivity_helper_jobs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for productivity_helper_jobs

CREATE TABLE IF NOT EXISTS data_platform.productivity_helper_jobs
(
    job_id serial4 NOT NULL ,
    email character varying(500) COLLATE pg_catalog."default" NOT NULL,
    created_on timestamp without time zone NOT NULL,
    prompt character varying COLLATE pg_catalog."default",
    question character varying COLLATE pg_catalog."default",
    response character varying COLLATE pg_catalog."default",
    query_type character varying COLLATE pg_catalog."default",
    CONSTRAINT productivity_helper_jobs_pkey PRIMARY KEY (job_id)
);