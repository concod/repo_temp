--liquibase formatted sql
--changeset arjun:background_process_locks stripComments:false splitStatements:false context:Release_1_0 labels:background_process_locks
--comment: initial changeset for background_process_locks

CREATE TABLE IF NOT EXISTS inventory_smart.background_process_locks (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_expires_at ON inventory_smart.background_process_locks (expires_at);
