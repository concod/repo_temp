--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:tb_integration_logs_1 stripComments:false splitStatements:false context:Release_1_0 labels:promotion
--comment: Create table for tracking promotion integration processes
--rollback: DROP TABLE IF EXISTS price_promo.tb_integration_logs;

CREATE TABLE IF NOT EXISTS price_promo.tb_integration_logs (
    integration_id SERIAL PRIMARY KEY,
    promo_ids INTEGER[] NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('execute', 'withdraw')),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    message TEXT,
    priority_number INTEGER NOT NULL,
    request_payload JSONB,
    file_names_uploaded TEXT NULL
);

-- Create index for the array of promo_ids for efficient searches
CREATE INDEX IF NOT EXISTS idx_promo_integration_logs_promo_ids ON price_promo.tb_integration_logs USING GIN(promo_ids);

-- Create index on status for filtering by status
CREATE INDEX IF NOT EXISTS idx_promo_integration_logs_status ON price_promo.tb_integration_logs USING BTREE(status);
