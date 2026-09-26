--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:data_source_config stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sourcing config

CREATE TABLE IF NOT EXISTS data_platform.data_source_config
(
    data_source_config_id serial4 NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    is_valid boolean NOT NULL DEFAULT false,
    CONSTRAINT data_source_config_name_uk UNIQUE (name),
    CONSTRAINT data_source_config_pk PRIMARY KEY (data_source_config_id)  
);