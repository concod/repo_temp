--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:bp_store_group_sync_log stripComments:false splitStatements:false
--comment: changeset for base_pricing.bp_store_group_sync_log

CREATE TABLE base_pricing.bp_store_group_sync_log (
    id              bigserial     PRIMARY KEY,
    batch_id        varchar(255)  NOT NULL,
    source          varchar(100)  NOT NULL,
    source_sg_id    varchar(255)  NOT NULL,
    source_sg_name  varchar(255)  NOT NULL,
    sg_id           varchar(255),
    sg_name         varchar(255),
    sync_status     varchar(50)   NOT NULL,
    message         jsonb         NOT NULL DEFAULT '{}'::jsonb,
    created_by      integer       NOT NULL,
    created_at      timestamp     NOT NULL DEFAULT NOW(),
    updated_at      timestamp     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_bp_store_group_sync_log_batch_id     ON base_pricing.bp_store_group_sync_log(batch_id);
CREATE INDEX ix_bp_store_group_sync_log_created_at   ON base_pricing.bp_store_group_sync_log(created_at);
CREATE INDEX ix_bp_store_group_sync_log_source_sg_id ON base_pricing.bp_store_group_sync_log(source_sg_id);
CREATE INDEX ix_bp_store_group_sync_log_status       ON base_pricing.bp_store_group_sync_log(sync_status);
