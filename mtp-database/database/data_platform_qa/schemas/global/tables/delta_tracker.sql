--liquibase formatted sql
--changeset liquibase:delta_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delta_tracker
CREATE TABLE global.delta_tracker (
    table_name character varying NOT NULL,
    created_at character varying DEFAULT now() NOT NULL,
    key character varying NOT NULL
);
