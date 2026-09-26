--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:allocation_constraint_failures stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_constraint_failures
CREATE TABLE source_smart.allocation_constraint_failures (
    constraint_failure_id UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id         UUID            NOT NULL,
    operation_id          UUID            NOT NULL,
    constraint_id         INT             NOT NULL,
    constraint_type       VARCHAR(100)    NOT NULL,
    constraint_keys       JSONB           NOT NULL,
    flexibility           VARCHAR(10)     NOT NULL,
    created_at            TIMESTAMPTZ     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_acf_allocation_plan
        FOREIGN KEY (allocation_id, operation_id)
        REFERENCES source_smart.allocation_plans(allocation_id, operation_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_acf_alloc_op
    ON source_smart.allocation_constraint_failures (allocation_id, operation_id);
