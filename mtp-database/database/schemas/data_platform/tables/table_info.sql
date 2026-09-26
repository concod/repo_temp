--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:table_info stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_info

CREATE TABLE IF NOT EXISTS data_platform.table_info
(
    table_id serial4 NOT NULL ,
    table_name character varying COLLATE pg_catalog."default" NOT NULL,
    table_description character varying COLLATE pg_catalog."default",
    table_location character varying COLLATE pg_catalog."default" NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT table_pk PRIMARY KEY (table_id),
    CONSTRAINT table_name_uk UNIQUE (table_name)
);