--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_daily_active_strategy_refresh_queue stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_daily_active_strategy_refresh_queue


CREATE TABLE IF NOT EXISTS base_pricing.bp_daily_active_strategy_refresh_queue (
    strategy_id      INT NOT NULL,
    refresh_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    priority         INT NOT NULL DEFAULT 0,
    retry_count      INT NOT NULL DEFAULT 0,                -- Tracks number of retries
    max_retries      INT NOT NULL DEFAULT 3,                -- Max attempts allowed
    is_retryable     BOOLEAN DEFAULT TRUE,                  -- Based on determine_can_retry()
    error_message    TEXT,
    metadata         JSONB,                                  -- Stores payload & trigger context
    started_at       TIMESTAMPTZ,
    finished_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (strategy_id, refresh_date),
    CONSTRAINT fk_refresh_queue_strategy FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id)
);

	
--changeset abhishek.singh@impactanalytics.co:bp_daily_active_strategy_refresh_queue_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_daily_active_strategy_refresh_queue_1
ALTER TABLE base_pricing.bp_daily_active_strategy_refresh_queue 
ALTER COLUMN max_retries SET DEFAULT 2;