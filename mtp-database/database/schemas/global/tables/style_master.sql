--liquibase formatted sql
--changeset liquibase:style_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_master
CREATE TABLE global.style_master (
    style_code character varying NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE global.style_master
    ADD CONSTRAINT style_master_pk PRIMARY KEY (style_code);
