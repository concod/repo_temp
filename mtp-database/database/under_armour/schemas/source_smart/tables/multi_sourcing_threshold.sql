
--liquibase formatted sql
--changeset liquibase:multi_sourcing_threshold stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for multi_sourcing_threshold
CREATE TABLE source_smart.multi_sourcing_threshold (
    threshold_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division               VARCHAR(50)  NOT NULL,
    style_level            VARCHAR(20)  NOT NULL,
    condition              VARCHAR(50)  NOT NULL,
    comparison_param       VARCHAR(50)  NOT NULL,
    threshold_value        NUMERIC      NOT NULL,
    edited_threshold_value NUMERIC,
    is_active              BOOLEAN      NOT NULL DEFAULT true,
    created_by             VARCHAR(100),
    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    last_modified_by       VARCHAR(100),
    last_modified          TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT uq_multi_sourcing_threshold_division EXCLUDE (division WITH =) WHERE (is_active = true)
);