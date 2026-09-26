--liquibase formatted sql
--changeset liquibase:dimensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimensions
CREATE TABLE global.dimensions (
    name character varying NOT NULL,
    CONSTRAINT dimensions_name_check CHECK (((length((name)::text) > 0) AND (length(regexp_replace((name)::text, '[a-zA-Z0-9\-\.\w]+'::text, ''::text, 'g'::text)) = 0)))
);
