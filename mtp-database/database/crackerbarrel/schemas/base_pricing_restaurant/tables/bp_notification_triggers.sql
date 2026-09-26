--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_triggers stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_triggers

CREATE TABLE base_pricing_restaurant.bp_notification_triggers (
	id serial4 NOT NULL,
	user_id varchar(50) NOT NULL,
	tenant_id varchar(50) NOT NULL,
	notification_id int4 NULL,
	trigger_type varchar(50) DEFAULT 'websocket_trigger'::character varying NULL,
	status varchar(20) DEFAULT 'pending'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	processed_at timestamp NULL,
	retry_count int4 DEFAULT 0 NULL,
	max_retries int4 DEFAULT 3 NULL,
	error_message text NULL,
	CONSTRAINT bp_notification_triggers_pkey PRIMARY KEY (id),
	CONSTRAINT unique_user_tenant_trigger UNIQUE (user_id, tenant_id)
);
CREATE INDEX idx_notification_triggers_status_created ON base_pricing_restaurant.bp_notification_triggers USING btree (status, created_at);
CREATE INDEX idx_notification_triggers_user_tenant ON base_pricing_restaurant.bp_notification_triggers USING btree (user_id, tenant_id);