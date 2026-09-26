--liquibase formatted sql
--changeset akash.zalavadiya@impactanalytics.co:data_ingestion_config stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added hidden column in data_ingestion_config table

CREATE TABLE IF NOT EXISTS data_platform.data_ingestion_config
(
    attribute_name character varying COLLATE pg_catalog."default" NOT NULL,
    attribute_value text COLLATE pg_catalog."default",
    module character varying COLLATE pg_catalog."default" NOT NULL,
    is_mandatory boolean,
    description character varying COLLATE pg_catalog."default",
    display_name character varying COLLATE pg_catalog."default",
    version integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    is_latest boolean NOT NULL,
    datatype character varying COLLATE pg_catalog."default",
    hidden boolean DEFAULT false,
    CONSTRAINT data_ingestion_config_pkey PRIMARY KEY (attribute_name, module, version)
);

CREATE INDEX IF NOT EXISTS inx_data_ingestion_config_latest
    ON data_platform.data_ingestion_config USING btree
    (is_latest ASC NULLS LAST);


--changeset hisham.mohammed@impactanalytics.co:data_ingestion_config_add_instance stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Add 'instance' column if not exists with default value 1, and update primary key in data_ingestion_config table, and update the primary key constraint, and update the instance column

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'data_platform'
          AND table_name = 'data_ingestion_config'
          AND column_name = 'instance'
    ) THEN
        ALTER TABLE data_platform.data_ingestion_config
        ADD COLUMN instance smallint DEFAULT 1 NOT NULL;
    END IF;
END
$$;

DO $$
BEGIN
   IF EXISTS (
       SELECT 1
       FROM information_schema.table_constraints
       WHERE constraint_schema = 'data_platform'
         AND table_name = 'data_ingestion_config'
         AND constraint_name = 'data_ingestion_config_pkey'
   ) THEN
       EXECUTE 'ALTER TABLE data_platform.data_ingestion_config DROP CONSTRAINT data_ingestion_config_pkey';
   END IF;
END
$$;

ALTER TABLE data_platform.data_ingestion_config
ADD CONSTRAINT data_ingestion_config_pkey PRIMARY KEY (attribute_name, module, version, instance);