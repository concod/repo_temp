--liquibase formatted sql
--changeset arunangshu.pramanik@impactanalytics.co:task_instances_time_reports_serial stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: task_instances_time_reports with SERIAL PK and composite FK → dag_runs_time_reports

CREATE TABLE IF NOT EXISTS data_platform.task_instances_time_reports (
    ti_serial_id SERIAL PRIMARY KEY,
    ti_dag_id VARCHAR(255) NOT NULL,
    ti_task_id VARCHAR(255) NOT NULL,
    ti_run_id VARCHAR(255) NOT NULL,
    ti_start_date TIMESTAMPTZ NULL,
    ti_end_date TIMESTAMPTZ NULL,
    ti_duration_seconds NUMERIC(10, 2) NULL,
    ti_state VARCHAR(50) NULL,
    ti_try_number INTEGER NOT NULL,
    ti_max_tries INTEGER NULL,
    ti_operator VARCHAR(255) NULL,
    ti_pool VARCHAR(255) NULL,
    ti_queue VARCHAR(255) NULL,
    ti_priority_weight INTEGER NULL,
    ti_log_url TEXT NULL,
    ti_info_created_at TIMESTAMPTZ DEFAULT NOW(),
    module_type VARCHAR(100) NOT NULL,

    -- Unique key used for the TI upsert
    CONSTRAINT unique_task_instance_info 
        UNIQUE (ti_dag_id, ti_task_id, ti_run_id, ti_try_number, ti_operator, module_type),

    -- Composite FK → dag_runs_time_reports business key
    CONSTRAINT fk_ti_to_dr_composite
        FOREIGN KEY (ti_dag_id, ti_run_id, module_type)
        REFERENCES data_platform.dag_runs_time_reports (dr_dag_id, dr_run_id, module_type)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_instances_time_reports_ti_info_created_at
    ON data_platform.task_instances_time_reports (ti_info_created_at);

CREATE INDEX IF NOT EXISTS idx_task_instances_time_reports_ti_dag_id_ti_task_id_ti_run_id
    ON data_platform.task_instances_time_reports (ti_dag_id, ti_task_id, ti_run_id);

CREATE INDEX IF NOT EXISTS idx_task_instances_time_reports_ti_state
    ON data_platform.task_instances_time_reports (ti_state);

CREATE INDEX IF NOT EXISTS idx_task_instances_time_reports_module_type
    ON data_platform.task_instances_time_reports (module_type);

