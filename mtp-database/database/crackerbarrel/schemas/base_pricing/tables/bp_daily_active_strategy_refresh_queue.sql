--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_daily_active_strategy_refresh_queue_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_daily_active_strategy_refresh_queue_1

CREATE TABLE base_pricing.bp_daily_active_strategy_refresh_queue (
	strategy_id int4 NOT NULL,
	refresh_date date DEFAULT CURRENT_DATE NOT NULL,
	status varchar(50) DEFAULT 'PENDING'::character varying NOT NULL,
	priority int4 DEFAULT 0 NOT NULL,
	retry_count int4 DEFAULT 0 NOT NULL,
	max_retries int4 DEFAULT 2 NOT NULL,
	is_retryable bool DEFAULT true NULL,
	error_message text NULL,
	metadata jsonb NULL,
	started_at timestamptz NULL,
	finished_at timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_daily_active_strategy_refresh_queue_pkey PRIMARY KEY (strategy_id, refresh_date),
	CONSTRAINT fk_refresh_queue_strategy FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id)
);