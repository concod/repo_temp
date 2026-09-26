--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:assort_smart.line_arch_final_level_status stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for line_arch_final_level_status
CREATE table if not exists assort_smart.line_arch_final_level_status (
    id SERIAL PRIMARY KEY,
    plan_code INTEGER,
    final_level VARCHAR,
    status VARCHAR,
	created_by int,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX if not exists idx_line_arch_final_level_status
ON assort_smart.line_arch_final_level_status(plan_code);

--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_final_level_status stripComments:false splitStatements:false context:MTP-87204 labels:create_table
--comment: changeset for line_arch_final_level_status updated_at column addition
ALTER TABLE assort_smart.line_arch_final_level_status 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();