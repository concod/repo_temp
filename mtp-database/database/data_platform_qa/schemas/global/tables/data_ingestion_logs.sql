--liquibase formatted sql
--changeset kamalesh.k:data_ingestion_logs stripComments:false splitStatements:false context:Release_1_0 labels:data_ingestion_logs
--comment: initial changeset for data_ingestion_logs

CREATE TABLE "global".data_ingestion_logs (
    log_code VARCHAR NOT NULL,
    target_table_sp VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_by VARCHAR NOT NULL DEFAULT current_user,
    comments TEXT,
    params jsonb DEFAULT '{}'::jsonb
);
