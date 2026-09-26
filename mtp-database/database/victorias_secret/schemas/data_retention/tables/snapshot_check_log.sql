--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:snapshot_check_log_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for snapshot_check_log
CREATE TABLE IF NOT EXISTS data_retention.snapshot_check_log (
    table_name TEXT,
    min_snapshot_date DATE,
    max_snapshot_date DATE,
    cnt_min BIGINT,
    cnt_max BIGINT,
    cnt_live BIGINT
);
