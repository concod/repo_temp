--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_delivery_log stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_delivery_log

CREATE TABLE base_pricing_restaurant.bp_notification_delivery_log (
	id bigserial NOT NULL,
	notification_id int8 NOT NULL,
	channel varchar(50) NOT NULL,
	status varchar(20) NOT NULL,
	error_message text NULL,
	delivery_time timestamptz NULL,
	retry_count int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_notification_delivery_log_pkey PRIMARY KEY (id),
	CONSTRAINT bp_notification_delivery_log_status_check CHECK (((status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text])))
);
CREATE INDEX idx_bp_notification_delivery_log_channel ON base_pricing_restaurant.bp_notification_delivery_log USING btree (channel);
CREATE INDEX idx_bp_notification_delivery_log_notification_id ON base_pricing_restaurant.bp_notification_delivery_log USING btree (notification_id);
CREATE INDEX idx_bp_notification_delivery_log_status ON base_pricing_restaurant.bp_notification_delivery_log USING btree (status);