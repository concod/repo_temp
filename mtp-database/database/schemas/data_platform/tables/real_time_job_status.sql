--liquibase formatted sql
--changeset arunangshu.pramanik@impactanalytics.co:real_time_job_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for real_time_job_status with index on job_id

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS data_platform.real_time_job_status (
    serial_id SERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    function_name TEXT NOT NULL,
    function_status TEXT NOT NULL,
    job_status TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create non-unique index on job_id
CREATE INDEX idx_real_time_job_status_job_id ON data_platform.real_time_job_status (job_id);
