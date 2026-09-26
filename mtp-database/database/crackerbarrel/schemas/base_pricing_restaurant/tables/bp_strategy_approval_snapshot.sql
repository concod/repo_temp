--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_approval_snapshot_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_approval_snapshot_1

CREATE TABLE base_pricing_restaurant.bp_strategy_approval_snapshot (
	strategy_id int4 NOT NULL,
	preserved_strategy_status_id int4 NOT NULL,
	preserved_approved_on timestamptz NULL,
	preserved_approved_by varchar(255) NULL,
	preserved_updated_at timestamptz NULL,
	preserved_updated_by int4 NULL,
	snapshot_reason varchar(50) DEFAULT 'refresh'::character varying NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	expires_at timestamptz NULL,
	CONSTRAINT bp_strategy_approval_snapshot_pkey PRIMARY KEY (strategy_id)
);
CREATE INDEX idx_approval_snapshot_expires ON base_pricing_restaurant.bp_strategy_approval_snapshot USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_approval_snapshot_strategy ON base_pricing_restaurant.bp_strategy_approval_snapshot USING btree (strategy_id);
