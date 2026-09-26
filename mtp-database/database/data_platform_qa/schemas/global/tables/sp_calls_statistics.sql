--liquibase formatted sql
--changeset liquibase:sp_calls_statistics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sp_calls_statistics
CREATE TABLE global.sp_calls_statistics (
    created_at timestamptz DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    sql text NOT NULL,
    cursor_code character varying NOT NULL,
    time_taken real NOT NULL
);
