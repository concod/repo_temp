--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:generic_trigger_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for generic_trigger_mapping

CREATE TABLE IF NOT EXISTS data_platform.generic_trigger_mapping
(
    view character varying COLLATE pg_catalog."default" NOT NULL,
    source_config character varying COLLATE pg_catalog."default",
    connector character varying COLLATE pg_catalog."default",
    trigger_rule character varying COLLATE pg_catalog."default",
    trigger_query character varying COLLATE pg_catalog."default",
    trigger_query_filter character varying COLLATE pg_catalog."default",
    trigger_file character varying COLLATE pg_catalog."default",
    is_mandatory boolean,
    is_deleted boolean,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone
);

--changeset manoj.solanki@impactanalytics.co:config_update stripComments:false splitStatements:false context:Release_1_1 labels:generic_trigger_mapping
--comment: default var fix
ALTER TABLE data_platform.generic_trigger_mapping ALTER COLUMN is_deleted SET DEFAULT false;


--changeset hisham.mohammed@impactanalytics.co:add_instance_to_generic_trigger_mapping stripComments:false splitStatements:false context:Release_1_1 labels:generic_trigger_mapping
--comment: Add 'instance' column to generic_trigger_mapping table if not exists

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'data_platform'
          AND table_name = 'generic_trigger_mapping'
          AND column_name = 'instance'
    ) THEN
        ALTER TABLE data_platform.generic_trigger_mapping
        ADD COLUMN instance smallint DEFAULT 1 NOT NULL;
    END IF;
END
$$;
