--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:assort_smart.line_plan_status stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for line_plan_status

CREATE table if not exists assort_smart.line_plan_status (
    id SERIAL PRIMARY KEY,
    plan_code INTEGER,
    status VARCHAR,
	created_by int,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for frequently searched columns
-- Composite index for most common search pattern
CREATE INDEX if not exists idx_line_plan_status
ON assort_smart.line_plan_status(plan_code);