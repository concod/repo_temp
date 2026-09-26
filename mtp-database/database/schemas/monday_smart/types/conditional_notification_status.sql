--liquibase formatted sql
--changeset sivaprasath.vadivel:conditional_notification_status stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for conditional_notification_status

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conditional_notification_status') THEN
	CREATE TYPE monday_smart."conditional_notification_status" AS ENUM (
		'created',
		'seen',
		'deleted',
		'triggered'
	);
	END IF;
END
$$;