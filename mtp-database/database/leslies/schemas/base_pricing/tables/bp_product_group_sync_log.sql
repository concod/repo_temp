--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:bp_product_group_sync_log stripComments:false splitStatements:false
--comment: changeset for base_pricing.bp_product_group_sync_log

CREATE TABLE base_pricing.bp_product_group_sync_log (
    id              bigserial    PRIMARY KEY,
    batch_id        uuid         NOT NULL,
    source          varchar(50)  NOT NULL DEFAULT 'promosmart',
    source_pg_id    integer,
    source_pg_name  varchar(500),
    pg_id           integer,
    pg_name         varchar(500),
    sync_status     varchar(20)  NOT NULL DEFAULT 'in_progress'
                                 CHECK (sync_status IN ('in_progress','success','failure')),
    message         jsonb        NOT NULL DEFAULT '{}'::jsonb,
    created_by      integer      NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT NOW(),
    updated_at      timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_bp_product_group_sync_log_batch_id ON base_pricing.bp_product_group_sync_log(batch_id);
CREATE INDEX ix_bp_product_group_sync_log_status   ON base_pricing.bp_product_group_sync_log(sync_status);
