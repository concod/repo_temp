--liquibase formatted sql
--changeset sivaprasath.vadivel:conditional_notification_channels stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for conditional_notification_channels

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conditional_notification_channels') THEN
	CREATE TYPE monday_smart."conditional_notification_channels" AS ENUM (
		'email',
		'slack',
		'whatsapp',
		'sms',
		'app'
	);
	END IF;
END
$$;