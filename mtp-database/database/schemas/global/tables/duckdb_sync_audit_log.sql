--liquibase formatted sql
--changeset liquibase:duckdb_sync_audit_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for duckdb_sync_audit_log
CREATE TABLE IF NOT EXISTS global.duckdb_sync_audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_names TEXT[] NOT NULL,  -- list of tables synced together in this batch
    state VARCHAR(50) NOT NULL,  -- started, in_progress, completed, failed
    tenant VARCHAR(255) NOT NULL,
    rows_synced INTEGER DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

--changeset liquibase:duckdb_sync_audit_log_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add audit_id column and sequence, change table_names to TEXT for per-table rows

CREATE SEQUENCE IF NOT EXISTS global.duckdb_sync_audit_id_seq;

ALTER TABLE global.duckdb_sync_audit_log
    ADD COLUMN IF NOT EXISTS audit_id BIGINT DEFAULT nextval('global.duckdb_sync_audit_id_seq');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'global'
          AND table_name = 'duckdb_sync_audit_log'
          AND column_name = 'table_names'
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE global.duckdb_sync_audit_log
            ALTER COLUMN table_names TYPE TEXT USING array_to_string(table_names, ',');
    END IF;
END $$;