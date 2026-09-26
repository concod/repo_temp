--liquibase formatted sql
--changeset sivaprasath.vadivel:new_notification_status stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for new_notification_status

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'new_notification_status') THEN
		CREATE TYPE monday_smart."new_notification_status" AS ENUM (
			'created',
			'seen',
			'deleted'
		);
	END IF;
END
$$;