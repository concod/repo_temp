--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_audit_trail_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_audit_trail_v2

CREATE TABLE base_pricing.bp_audit_trail (
    audit_id integer NOT NULL,
    table_name text NOT NULL,
    record_id integer NOT NULL,
    operation_type text NOT NULL,
    changed_fields jsonb NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by integer NOT NULL,
    changed_at timestamp with time zone NOT NULL,
    CONSTRAINT bp_audit_trail_pkey PRIMARY KEY (audit_id)
);