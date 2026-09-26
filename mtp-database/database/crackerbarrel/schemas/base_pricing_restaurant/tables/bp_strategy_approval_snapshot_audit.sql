--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_approval_snapshot_audit_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_approval_snapshot_audit_1

CREATE TABLE base_pricing_restaurant.bp_strategy_approval_snapshot_audit (
	id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	deleted_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	deleted_by text NULL,
	deletion_reason text NULL,
	preserved_strategy_status_id int4 NULL,
	preserved_approved_on timestamptz NULL,
	preserved_approved_by varchar(255) NULL,
	stack_trace text NULL,
	CONSTRAINT bp_strategy_approval_snapshot_audit_pkey PRIMARY KEY (id),
	CONSTRAINT fk_audit_strategy FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE RESTRICT
);