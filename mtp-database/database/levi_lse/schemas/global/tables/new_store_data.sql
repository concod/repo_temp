--liquibase formatted sql
--changeset himansh.bhardwaj:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_data

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'global'
          AND table_name = 'new_store_data'
    ) THEN
        CREATE TABLE "global".new_store_data (
            store_code varchar NOT NULL,
            store_name varchar NULL,
            CONSTRAINT new_store_data_pk PRIMARY KEY (store_code)
        );
    END IF;
END $$;
