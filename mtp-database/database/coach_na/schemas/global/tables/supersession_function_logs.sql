--liquibase formatted sql
--changeset rajesh.draksharapu:supersession_function_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for supersession_function_logs

CREATE TABLE IF NOT EXISTS global.supersession_function_logs (
    id SERIAL PRIMARY KEY,
    allocation_code VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    execution_time_seconds NUMERIC(10, 3),
    sku_count INTEGER,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supersession_logs_allocation_code ON global.supersession_function_logs(allocation_code);
CREATE INDEX IF NOT EXISTS idx_supersession_logs_created_at ON global.supersession_function_logs(created_at);

