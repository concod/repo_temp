--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:custom_qc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_qc

CREATE TABLE IF NOT EXISTS data_platform.custom_qc
(
    qc_id serial4 NOT NULL ,
    qc_name character varying COLLATE pg_catalog."default" NOT NULL,
    qc_description character varying COLLATE pg_catalog."default",
    table_id integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    qc_type character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT qc_pk PRIMARY KEY (qc_id),
    CONSTRAINT qc_name_uk UNIQUE (qc_name),
    CONSTRAINT table_master_fk FOREIGN KEY (table_id)
        REFERENCES data_platform.table_info (table_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);