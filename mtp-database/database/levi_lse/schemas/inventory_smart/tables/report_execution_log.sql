--liquibase formatted sql
--changeset tarun.tyagi@impactanalytics.co:report_execution_log stripComments:false splitStatements:false context:Release_1 labels:report_execution_log
--comment: create report execution log table
CREATE TABLE IF NOT EXISTS inventory_smart.report_execution_log (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
    record_count INTEGER NOT NULL DEFAULT 0,
    validation_errors JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Index for frequency check queries (finding last successful execution by report type)
CREATE INDEX IF NOT EXISTS idx_report_execution_log_type_status_ts 
ON inventory_smart.report_execution_log (report_type, status, execution_timestamp DESC);
-- Optional: Index for general lookups by report type
CREATE INDEX IF NOT EXISTS idx_report_execution_log_report_type 
ON inventory_smart.report_execution_log (report_type);
COMMENT ON TABLE inventory_smart.report_execution_log IS 'Tracks execution history of Levi outbound reports for frequency enforcement and audit';
COMMENT ON COLUMN inventory_smart.report_execution_log.status IS 'success = completed successfully, failed = validation failed, blocked = frequency check blocked';
COMMENT ON COLUMN inventory_smart.report_execution_log.validation_errors IS 'JSON array of error messages when status is failed or blocked';