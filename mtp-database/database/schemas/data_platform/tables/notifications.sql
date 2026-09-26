--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:notifications stripComments:false splitStatements:false context:Release_1_0 labels:data_platform_notifications
--comment: initial changeset for data platform notifications

CREATE TABLE data_platform.notifications (
	notification_id serial4 NOT NULL,
	notification_type text NULL,
	notification_message text NULL,
	read_status bool NULL,
	create_dt timestamptz NULL,
	update_dt timestamptz NULL,
	created_by int4 NULL,
	notification_module text NULL,
	soft_delete bool NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
);


--changeset himani.sharma@impactanalytics.co:notifications stripComments:false splitStatements:false context:Release_1_1 labels:data_platform_notifications_update2
--comment: updating notifications table to work for multiple users
ALTER TABLE data_platform.notifications DROP COLUMN read_status;
ALTER TABLE data_platform.notifications ADD COLUMN read_status json NULL;
ALTER TABLE data_platform.notifications DROP COLUMN soft_delete;
ALTER TABLE data_platform.notifications ADD COLUMN soft_delete json NULL;