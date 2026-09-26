--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:masking_rules stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for masking_rules

CREATE TABLE IF NOT EXISTS data_platform.masking_rules
(
    masking_id serial4 NOT NULL,
    match_pattern character varying COLLATE pg_catalog."default",
    replace_pattern character varying COLLATE pg_catalog."default",
    is_deleted boolean NOT NULL DEFAULT false,
    created_by smallint,
    created_at timestamp with time zone NOT NULL,
    updated_by smallint,
    updated_at timestamp with time zone,
    deleted_by smallint,
    deleted_at timestamp with time zone,
    CONSTRAINT dmasking_pk PRIMARY KEY (masking_id)
);