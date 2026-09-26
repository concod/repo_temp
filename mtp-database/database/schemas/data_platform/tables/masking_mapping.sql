--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:masking_mapping stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for masking_mapping

CREATE TABLE IF NOT EXISTS data_platform.masking_mapping
(
    masking_mapping_id serial4 NOT NULL,
    generic_schema_mapping character varying COLLATE pg_catalog."default",
    generic_column_name character varying COLLATE pg_catalog."default",
    masking_id smallint NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    created_by smallint,
    created_at timestamp with time zone NOT NULL,
    updated_by smallint,
    updated_at timestamp with time zone,
    deleted_by smallint,
    deleted_at timestamp with time zone,
    CONSTRAINT dmasking_mapping_pk PRIMARY KEY (masking_mapping_id),
    CONSTRAINT dmasking_fk FOREIGN KEY (masking_id)
        REFERENCES data_platform.masking_rules (masking_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);