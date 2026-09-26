--liquibase formatted sql
--changeset arunangshu.pramanik@impactanalytics.co:dag_runs_time_reports stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dag_runs_time_reports with indexes on dr_dag_id, dr_run_id, dr_info_created_at, dr_execution_date, dr_state, module_type


CREATE TABLE IF NOT EXISTS data_platform.dag_runs_time_reports (
    dr_serial_id SERIAL PRIMARY KEY,
    dr_dag_id VARCHAR(255) NOT NULL,
    dr_run_id VARCHAR(255) NOT NULL,          -- identifies the run with dag_id
    dr_run_type VARCHAR(50) NULL,
    dr_state VARCHAR(50) NULL,
    dr_external_trigger BOOLEAN NULL,
    dr_execution_date TIMESTAMPTZ NOT NULL,
    dr_start_date TIMESTAMPTZ NULL,
    dr_end_date TIMESTAMPTZ NULL,
    dr_instance_id VARCHAR(200) NULL,
    dr_instance_name VARCHAR(200) NULL,
    dr_info_created_at TIMESTAMPTZ DEFAULT NOW(),
    module_type VARCHAR(100) NOT NULL,        -- env / product dimension

    -- Single business key for this table: used for ON CONFLICT & FK
    CONSTRAINT unique_dr_business_key
        UNIQUE (dr_dag_id, dr_run_id, module_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dag_runs_time_reports_dr_info_created_at
    ON data_platform.dag_runs_time_reports (dr_info_created_at);

CREATE INDEX IF NOT EXISTS idx_dag_runs_time_reports_dr_dag_id_dr_run_id
    ON data_platform.dag_runs_time_reports (dr_dag_id, dr_run_id);

CREATE INDEX IF NOT EXISTS idx_dag_runs_time_reports_dr_execution_date
    ON data_platform.dag_runs_time_reports (dr_execution_date);

CREATE INDEX IF NOT EXISTS idx_dag_runs_time_reports_dr_state
    ON data_platform.dag_runs_time_reports (dr_state);

CREATE INDEX IF NOT EXISTS idx_dag_runs_time_reports_module_type
    ON data_platform.dag_runs_time_reports (module_type);
