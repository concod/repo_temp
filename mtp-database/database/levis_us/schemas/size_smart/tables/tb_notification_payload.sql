
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_notification_payload_modification_changes stripComments:false splitStatements:false context:tb_notification_payload_modification_changes labels:tb_notification_payload_modification_changes
-- comment: updated changeset for tb_notification_payload


CREATE TABLE size_smart.tb_notification_payload (
	id varchar NOT NULL,
	payload jsonb NOT NULL,
	screen varchar NULL
);