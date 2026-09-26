--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_dead_letter_queue stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_dead_letter_queue

CREATE TABLE base_pricing_restaurant.bp_notification_dead_letter_queue (
	id bigserial NOT NULL,
	notification_id int8 NOT NULL,
	original_notification_data jsonb NOT NULL,
	failure_reason text NOT NULL,
	retry_count int4 DEFAULT 0 NULL,
	max_retries int4 DEFAULT 3 NULL,
	next_retry_at timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	processed_at timestamptz NULL,
	CONSTRAINT bp_notification_dead_letter_queue_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_bp_notification_dead_letter_queue_created_at ON base_pricing_restaurant.bp_notification_dead_letter_queue USING btree (created_at);
CREATE INDEX idx_bp_notification_dead_letter_queue_next_retry ON base_pricing_restaurant.bp_notification_dead_letter_queue USING btree (next_retry_at);