--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:workstream stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for workstream


CREATE TABLE IF NOT EXISTS data_platform.workstream
(
    workstream_id serial4 NOT NULL ,
    workstream_name character varying COLLATE pg_catalog."default" NOT NULL,
    workstream_value character varying COLLATE pg_catalog."default" NOT NULL,
    workstream_columns character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT workstream_pk PRIMARY KEY (workstream_id),
    CONSTRAINT workstream_cols_uk UNIQUE (workstream_columns)

);