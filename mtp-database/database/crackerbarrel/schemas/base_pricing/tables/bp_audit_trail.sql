--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_audit_trail stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_audit_trail

CREATE TABLE base_pricing.bp_audit_trail (
	audit_id int4 NOT NULL,
	table_name text NOT NULL,
	record_id int4 NOT NULL,
	operation_type text NOT NULL,
	changed_fields jsonb NOT NULL,
	old_values jsonb NULL,
	new_values jsonb NULL,
	changed_by int4 NOT NULL,
	changed_at timestamptz NOT NULL,
	CONSTRAINT bp_audit_trail_pkey PRIMARY KEY (audit_id)
);