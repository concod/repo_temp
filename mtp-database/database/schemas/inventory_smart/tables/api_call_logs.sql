--liquibase formatted sql
--changeset liquibase:api_call_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for api_call_logs - generic API call logging table

CREATE TABLE IF NOT EXISTS inventory_smart.api_call_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant VARCHAR(255) NULL,
    api_name VARCHAR(255) NOT NULL,  -- e.g., 'auto_allocation_complete_downstream'
    endpoint_url TEXT NOT NULL,
    http_method VARCHAR(10) NOT NULL,  -- GET, POST, PUT, DELETE, etc.
    trace_id VARCHAR(255),  -- For distributed tracing and request correlation
    request_payload JSONB,
    request_headers JSONB,
    response_status BOOLEAN,
    response_data JSONB,
    response_message TEXT,
    http_status_code INTEGER,
    request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_timestamp TIMESTAMPTZ,
    duration_ms INTEGER,  -- Request duration in milliseconds
    created_by int4 NULL,
    updated_by int4 NULL,
    error_details JSONB,  -- For exception details
    metadata JSONB,  -- For additional context (allocation_code, user_id, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invs_api_call_logs_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT invs_api_call_logs_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

CREATE INDEX idx_api_call_logs_created_at ON inventory_smart.api_call_logs(created_at);
CREATE INDEX idx_api_call_logs_api_name ON inventory_smart.api_call_logs(api_name);

--changeset liquibase:column_name_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for api_call_logs - generic API call logging table

ALTER TABLE inventory_smart.api_call_logs RENAME COLUMN trace_id TO traceid;