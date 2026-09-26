--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:config stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for config

CREATE TABLE IF NOT EXISTS data_platform.config
(
    config_id serial4 NOT NULL,
    config_name character varying NOT NULL,
    config_value json,
    module_id integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT config_pk PRIMARY KEY (config_id),
    CONSTRAINT module_master_fk FOREIGN KEY (module_id) REFERENCES global.module_master(module_code) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS config_name_uk
    ON data_platform.config USING btree
    (config_name ASC NULLS LAST, module_id ASC NULLS LAST)
    WHERE is_deleted = false;