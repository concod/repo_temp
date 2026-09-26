--liquibase formatted sql
--changeset sivaprasath.vadivel:conditional_notification_type stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for conditional_notification_type

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conditional_notification_type') THEN
	CREATE TYPE monday_smart."conditional_notification_type" AS ENUM (
		'alerts',
		'general'
	);
	END IF;
END
$$;