--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:sync_outbox_2 stripComments:false splitStatements:false context:data_sync labels:MTP-123514
--comment: Outbox table for event-driven cross-product data synchronization (Ordering to ItemSmart)

CREATE TABLE IF NOT EXISTS oms.sync_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid() NOT NULL,
    tenant VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    operation CHAR(1) NOT NULL,                -- 'I'nsert / 'U'pdate / 'D'elete
    payload JSONB NOT NULL,                    -- Full or configured record snapshot
    metadata JSONB,                            -- user, reason, context
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,                  -- When published to Pub/Sub
    acked_at TIMESTAMPTZ,                      -- When subscriber acknowledged
    ack_status VARCHAR(20),                    -- 'success' / 'failed' / NULL
    ack_attempts INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    is_tombstone BOOLEAN DEFAULT FALSE,        -- Mark for cleanup (soft delete tracking)
    CONSTRAINT uq_sync_outbox_event_id UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_unacked ON oms.sync_outbox (created_at) WHERE acked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant ON oms.sync_outbox (tenant, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_retry ON oms.sync_outbox (retry_count) WHERE acked_at IS NULL;
