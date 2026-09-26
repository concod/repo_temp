--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:uploaded_file_status stripComments:false splitStatements:false context:Release_1.1 labels:initial_commit
--comment: initial changeset for uploaded_file_status




-- DROP TABLE inventory_smart.uploaded_file_status;
CREATE TABLE inventory_smart.uploaded_file_status (
    uploaded_file_status_id SERIAL PRIMARY KEY,
    file_name text NOT NULL,
    file_path text NULL,
    status int4 NULL,
    created_by varchar NULL,
    updated_at timestamptz NULL,
    id text NOT NULL,
    screen text NULL,
    error_message text NULL
);